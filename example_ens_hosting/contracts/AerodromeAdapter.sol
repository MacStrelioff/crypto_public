// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./CreditLineToken.sol";

/**
 * @title AerodromeAdapter
 * @notice Handles all Aerodrome liquidity management operations
 * @dev This contract is responsible for creating and managing liquidity positions on Aerodrome
 */
contract AerodromeAdapter is Ownable, ReentrancyGuard {
    
    // Aerodrome addresses (Base Sepolia)
    address public constant CL_FACTORY = 0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A;
    address public constant POSITION_MANAGER = 0x827922686190790b37229fd06084350E74485b72;
    
    // Struct for position manager mint parameters
    struct MintParams {
        address token0;
        address token1;
        int24 tickSpacing;
        int24 tickLower;
        int24 tickUpper;
        uint256 amount0Desired;
        uint256 amount1Desired;
        uint256 amount0Min;
        uint256 amount1Min;
        address recipient;
        uint256 deadline;
        uint160 sqrtPriceX96;
    }
    
    // Constants for tick calculations  
    int24 private constant MIN_TICK = -887272;
    int24 private constant MAX_TICK = 887272;
    
    // Helper functions for tick calculations
    function getMinTick(int24 tickSpacing) private pure returns (int24) {
        return (MIN_TICK / tickSpacing) * tickSpacing;
    }
    
    function getMaxTick(int24 tickSpacing) private pure returns (int24) {
        return (MAX_TICK / tickSpacing) * tickSpacing;
    }
    
    // Events
    event PoolCreated(address indexed pool, address token0, address token1, int24 tickSpacing);
    event LiquidityPositionCreated(uint256 indexed tokenId, address indexed pool, uint128 liquidity);
    event LiquidityPositionRemoved(uint256 indexed tokenId, uint256 amount0, uint256 amount1);
    event FeesCollected(uint256 indexed tokenId, uint256 amount0, uint256 amount1);
    event ErrorOccurred(string operation, string error);
    
    // Debug events
    event DebugAdapterStep(string step, address indexed creditLineToken, uint256 timestamp);
    event DebugAdapterError(string step, string error, address indexed creditLineToken, uint256 timestamp);
    event DebugAdapterBalance(string step, address token, uint256 balance, uint256 timestamp);
    event DebugAdapterTransfer(string step, address from, address to, address token, uint256 amount, uint256 timestamp);
    event DebugAdapterCall(string step, address target, bytes4 functionSig, uint256 timestamp);
    event DebugAdapterPool(string step, address pool, address token0, address token1, uint256 timestamp);

    // Mapping to track positions for each credit line
    mapping(address => LiquidityPosition) public creditLinePositions;
    
    // Mapping to track authorized callers (like factories)
    mapping(address => bool) public authorizedCallers;
    
    struct LiquidityPosition {
        uint256 fullRangeTokenId;
        uint256 concentratedTokenId;
        address pool;
        bool exists;
    }
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Authorize a caller (like a factory) to call restricted functions
     * @param caller Address to authorize
     * @param authorized Whether to authorize or deauthorize
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }
    
    /**
     * @notice Create a liquidity pool and add initial liquidity for a credit line
     * @param creditLineToken Address of the credit line token
     * @param underlyingAsset Address of the underlying asset (e.g., WETH)
     * @param amount0 Amount of credit line tokens
     * @param amount1 Amount of underlying asset
     * @return pool The created pool address
     * @return fullRangeTokenId The NFT token ID for the full range position
     */
    function createPoolAndAddLiquidity(
        address creditLineToken,
        address underlyingAsset,
        uint256 amount0,
        uint256 amount1
    ) external returns (address pool, uint256 fullRangeTokenId) {
        // Only owner or authorized contracts can call this
        require(msg.sender == owner() || authorizedCallers[msg.sender], "Unauthorized caller");
        
        emit DebugAdapterStep("createPoolAndAddLiquidity_start", creditLineToken, block.timestamp);
        
        // Sort tokens by address (Aerodrome requirement)
        (address token0, address token1) = creditLineToken < underlyingAsset 
            ? (creditLineToken, underlyingAsset) 
            : (underlyingAsset, creditLineToken);
        
        emit DebugAdapterPool("token_sorting", address(0), token0, token1, block.timestamp);
        
        // Adjust amounts based on token ordering
        (uint256 amount0Desired, uint256 amount1Desired) = creditLineToken < underlyingAsset 
            ? (amount0, amount1) 
            : (amount1, amount0);
        
        emit DebugAdapterStep("amounts_adjusted", creditLineToken, block.timestamp);
        
        // Use standard tick spacing for Aerodrome (100 is enabled)
        int24 tickSpacing = 100;
        
        // Pool will be created by Position Manager during mint if it doesn't exist
        emit DebugAdapterStep("pool_creation_delegated_to_position_manager", creditLineToken, block.timestamp);
        
        // Transfer tokens from credit line token to this adapter
        emit DebugAdapterTransfer("transfer_from_credit_line", creditLineToken, address(this), token0, amount0Desired, block.timestamp);
        IERC20(token0).transferFrom(creditLineToken, address(this), amount0Desired);
        
        emit DebugAdapterTransfer("transfer_from_credit_line", creditLineToken, address(this), token1, amount1Desired, block.timestamp);
        IERC20(token1).transferFrom(creditLineToken, address(this), amount1Desired);
        
        // Verify transfers
        uint256 adapterBalance0 = IERC20(token0).balanceOf(address(this));
        uint256 adapterBalance1 = IERC20(token1).balanceOf(address(this));
        emit DebugAdapterBalance("adapter_balance_after_transfer", token0, adapterBalance0, block.timestamp);
        emit DebugAdapterBalance("adapter_balance_after_transfer", token1, adapterBalance1, block.timestamp);
        
        // Add full range liquidity
        emit DebugAdapterStep("adding_full_range_liquidity", creditLineToken, block.timestamp);
        fullRangeTokenId = _addFullRangeLiquidity(
            token0,
            token1,
            tickSpacing,
            amount0Desired,
            amount1Desired
        );
        emit DebugAdapterStep("full_range_liquidity_added", creditLineToken, block.timestamp);
        
        // Add concentrated liquidity position at 1:1 price
        emit DebugAdapterStep("adding_concentrated_position", creditLineToken, block.timestamp);
        uint256 concentratedTokenId = _addConcentratedPosition(
            creditLineToken,
            PRICE_PRECISION // 1:1 price
        );
        emit DebugAdapterStep("concentrated_position_added", creditLineToken, block.timestamp);
        
        // Get pool address from CL_FACTORY after mint
        bytes memory getPoolCall = abi.encodeWithSelector(
            bytes4(keccak256("getPool(address,address,int24)")),
            token0,
            token1,
            tickSpacing
        );
        
        (bool poolExists, bytes memory poolResult) = CL_FACTORY.call(getPoolCall);
        if (poolExists && poolResult.length >= 32) {
            pool = abi.decode(poolResult, (address));
        } else {
            revert("Failed to get pool address after mint");
        }
        
        // Store the position information
        creditLinePositions[creditLineToken] = LiquidityPosition({
            fullRangeTokenId: fullRangeTokenId,
            concentratedTokenId: concentratedTokenId,
            pool: pool,
            exists: true
        });
        
        emit DebugAdapterStep("position_stored", creditLineToken, block.timestamp);
        
        emit PoolCreated(pool, token0, token1, tickSpacing);
        emit LiquidityPositionCreated(fullRangeTokenId, pool, 0); // liquidity will be set by position manager
        
        emit DebugAdapterStep("createPoolAndAddLiquidity_success", creditLineToken, block.timestamp);
        
        return (pool, fullRangeTokenId);
    }
    
    /**
     * @notice Remove liquidity from a position
     * @param creditLineToken Address of the credit line token
     * @param liquidity Amount of liquidity to remove
     * @return amount0 Amount of token0 received
     * @return amount1 Amount of token1 received
     */
    function removeLiquidity(
        address creditLineToken,
        uint128 liquidity
    ) external returns (uint256 amount0, uint256 amount1) {
        // Only owner or authorized contracts can call this
        require(msg.sender == owner() || authorizedCallers[msg.sender], "Unauthorized caller");
        
        LiquidityPosition storage position = creditLinePositions[creditLineToken];
        require(position.exists, "Position does not exist");
        require(position.fullRangeTokenId > 0, "No liquidity position");
        
        // Call position manager to decrease liquidity
        bytes memory decreaseData = abi.encodeWithSelector(
            bytes4(keccak256("decreaseLiquidity((uint256,uint128,uint256,uint256,uint256))")),
            position.fullRangeTokenId,
            liquidity,
            0, // amount0Min
            0, // amount1Min
            block.timestamp + 300 // deadline
        );
        
        (bool success, bytes memory result) = POSITION_MANAGER.call(decreaseData);
        
        if (success) {
            (amount0, amount1) = abi.decode(result, (uint256, uint256));
            emit LiquidityPositionRemoved(position.fullRangeTokenId, amount0, amount1);
        } else {
            emit ErrorOccurred("removeLiquidity", "Position manager call failed");
        }
    }
    
    /**
     * @notice Collect fees from a liquidity position
     * @param creditLineToken Address of the credit line token
     * @param recipient Address to receive the collected fees
     * @return amount0 Amount of token0 collected
     * @return amount1 Amount of token1 collected
     */
    function collectFees(
        address creditLineToken,
        address recipient
    ) external returns (uint256 amount0, uint256 amount1) {
        // Only owner or authorized contracts can call this
        require(msg.sender == owner() || authorizedCallers[msg.sender], "Unauthorized caller");
        
        LiquidityPosition storage position = creditLinePositions[creditLineToken];
        require(position.exists, "Position does not exist");
        require(position.fullRangeTokenId > 0, "No liquidity position");
        
        // Call position manager to collect fees
        bytes memory collectData = abi.encodeWithSelector(
            bytes4(keccak256("collect((uint256,address,uint128,uint128))")),
            position.fullRangeTokenId,
            recipient,
            type(uint128).max, // amount0Max
            type(uint128).max  // amount1Max
        );
        
        (bool success, bytes memory result) = POSITION_MANAGER.call(collectData);
        
        if (success) {
            (amount0, amount1) = abi.decode(result, (uint256, uint256));
            emit FeesCollected(position.fullRangeTokenId, amount0, amount1);
        } else {
            emit ErrorOccurred("collectFees", "Position manager call failed");
        }
    }
    
    /**
     * @notice Get position information for a credit line
     * @param creditLineToken Address of the credit line token
     * @return position The liquidity position information
     */
    function getPosition(address creditLineToken) external view returns (LiquidityPosition memory position) {
        return creditLinePositions[creditLineToken];
    }
    
    /**
     * @notice Emergency function to recover tokens
     * @param token Address of token to recover
     * @param amount Amount to recover
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    /**
     * @notice Emergency function to recover Aerodrome NFT
     * @param tokenId The NFT token ID
     */
    function emergencyWithdrawNFT(uint256 tokenId) external onlyOwner {
        require(tokenId > 0, "Invalid token ID");
        
        // Transfer the NFT to the owner
        bytes memory transferData = abi.encodeWithSelector(
            bytes4(keccak256("transferFrom(address,address,uint256)")),
            address(this),
            owner(),
            tokenId
        );
        
        (bool success,) = POSITION_MANAGER.call(transferData);
        require(success, "NFT transfer failed");
    }
    
    /**
     * @notice Get the current price from an Aerodrome pool
     * @param pool Address of the pool
     * @return price The current price as sqrtPriceX96
     * @return tick The current tick
     */
    function getPoolPrice(address pool) external view returns (uint160 price, int24 tick) {
        // Call the pool's slot0 function to get current price
        bytes memory slot0Call = abi.encodeWithSelector(
            bytes4(keccak256("slot0()"))
        );
        
        (bool success, bytes memory result) = pool.staticcall(slot0Call);
        
        if (success && result.length >= 96) {
            // slot0 returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)
            (price, tick,,,,,) = abi.decode(result, (uint160, int24, uint16, uint16, uint16, uint8, bool));
        } else {
            revert("Failed to get pool price");
        }
    }
    
    /**
     * @notice Get the price ratio between two tokens in a pool
     * @param pool Address of the pool
     * @param token0 Address of token0
     * @param token1 Address of token1
     * @return priceRatio Price ratio (token1/token0) with 18 decimals
     */
    function getPriceRatio(address pool, address token0, address token1) external view returns (uint256 priceRatio) {
        (uint160 sqrtPriceX96, int24 tick) = this.getPoolPrice(pool);
        
        // Convert sqrtPriceX96 to price ratio
        // sqrtPriceX96 = sqrt(price) * 2^96
        // price = (sqrtPriceX96 / 2^96)^2
        
        uint256 price = uint256(sqrtPriceX96);
        price = (price * price) >> 96; // Divide by 2^96
        price = price >> 96; // Divide by 2^96 again
        
        // If token0 is the credit line token and token1 is the underlying asset,
        // we need to invert the price to get underlying/creditLine ratio
        if (token0 < token1) {
            // Price is already in the right direction
            priceRatio = price;
        } else {
            // Need to invert the price
            priceRatio = (PRICE_PRECISION * PRICE_PRECISION) / price;
        }
        
        return priceRatio;
    }
    
    // Constants for price calculations
    uint256 private constant PRICE_PRECISION = 1e18;
    
    // Internal functions
    

    

    
    function _addFullRangeLiquidity(
        address token0,
        address token1,
        int24 tickSpacing,
        uint256 amount0Desired,
        uint256 amount1Desired
    ) private returns (uint256 tokenId) {
        
        emit DebugAdapterStep("_addFullRangeLiquidity_start", address(0), block.timestamp);
        
        // Create mint parameters for full range position
        MintParams memory params = MintParams({
            token0: token0,
            token1: token1,
            tickSpacing: tickSpacing,
            tickLower: getMinTick(tickSpacing),
            tickUpper: getMaxTick(tickSpacing),
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: address(this),
            deadline: block.timestamp + 300,
            sqrtPriceX96: 79228162514264337593543950336 // 1:1 price
        });
        
        emit DebugAdapterStep("mint_params_created", address(0), block.timestamp);
        
        // Approve tokens for the position manager
        emit DebugAdapterTransfer("approve_position_manager", address(this), POSITION_MANAGER, token0, amount0Desired, block.timestamp);
        IERC20(token0).approve(POSITION_MANAGER, amount0Desired);
        
        emit DebugAdapterTransfer("approve_position_manager", address(this), POSITION_MANAGER, token1, amount1Desired, block.timestamp);
        IERC20(token1).approve(POSITION_MANAGER, amount1Desired);
        
        emit DebugAdapterStep("tokens_approved", address(0), block.timestamp);
        
        // Call position manager with properly encoded MintParams struct
        bytes memory mintData = abi.encodeWithSelector(
            bytes4(keccak256("mint((address,address,int24,int24,int24,uint256,uint256,uint256,uint256,address,uint256,uint160))")),
            params
        );
        
        emit DebugAdapterCall("mint", POSITION_MANAGER, bytes4(keccak256("mint((address,address,int24,int24,int24,uint256,uint256,uint256,uint256,address,uint256,uint160))")), block.timestamp);
        (bool success, bytes memory result) = POSITION_MANAGER.call(mintData);
        
        if (success) {
            (tokenId,,,) = abi.decode(result, (uint256, uint128, uint256, uint256));
            emit DebugAdapterStep("mint_success", address(0), block.timestamp);
            return tokenId;
        } else {
            emit DebugAdapterError("_addFullRangeLiquidity", "Position manager mint failed", address(0), block.timestamp);
            emit ErrorOccurred("_addFullRangeLiquidity", "Position manager mint failed");
            revert("Mint failed");
        }
    }
    
    /**
     * @notice Accrue interest by moving the concentrated liquidity position to reflect APY
     * @param creditLineToken Address of the credit line token
     * @param apy APY in basis points
     * @param timeElapsed Time elapsed since last accrual in seconds
     * @return newPrice The new price after interest accrual
     */
    function accrueInterest(
        address creditLineToken,
        uint256 apy,
        uint256 timeElapsed
    ) external returns (uint256 newPrice) {
        // Only owner or authorized contracts can call this
        require(msg.sender == owner() || authorizedCallers[msg.sender], "Unauthorized caller");
        LiquidityPosition storage position = creditLinePositions[creditLineToken];
        require(position.exists, "Position does not exist");
        require(position.concentratedTokenId > 0, "No concentrated position");
        
        // Calculate the new price based on APY and time elapsed
        // APY is in basis points (e.g., 500 = 5%)
        // newPrice = currentPrice * (1 + (apy * timeElapsed) / (365 days * 10000))
        
        uint256 currentPrice = getCurrentPoolPrice(position.pool);
        uint256 interestRate = (apy * timeElapsed * PRICE_PRECISION) / (365 days * 10000);
        newPrice = currentPrice + interestRate;
        
        // Move the concentrated liquidity position to the new price
        _moveConcentratedPosition(creditLineToken, newPrice);
        
        // Update the token's last accrual time
        CreditLineToken(creditLineToken).updateLastAccrualTime(block.timestamp);
        
        emit InterestAccrued(creditLineToken, currentPrice, newPrice, timeElapsed);
    }
    
    /**
     * @notice Get the current price from the pool
     * @param pool Address of the pool
     * @return price The current price with 18 decimals
     */
    function getCurrentPoolPrice(address pool) public view returns (uint256 price) {
        (uint160 sqrtPriceX96,) = this.getPoolPrice(pool);
        
        // Convert sqrtPriceX96 to price with 18 decimals
        uint256 priceRaw = uint256(sqrtPriceX96);
        price = (priceRaw * priceRaw) >> 96; // Divide by 2^96
        price = price >> 96; // Divide by 2^96 again
        
        return price;
    }
    
    /**
     * @notice Move concentrated liquidity position to a new price
     * @param creditLineToken Address of the credit line token
     * @param newPrice The new price to move to
     */
    function _moveConcentratedPosition(address creditLineToken, uint256 newPrice) private {
        LiquidityPosition storage position = creditLinePositions[creditLineToken];
        
        // First, remove the current concentrated position
        if (position.concentratedTokenId > 0) {
            _removeConcentratedPosition(creditLineToken);
        }
        
        // Then, add a new concentrated position at the new price
        _addConcentratedPosition(creditLineToken, newPrice);
    }
    
    /**
     * @notice Remove the concentrated liquidity position
     * @param creditLineToken Address of the credit line token
     */
    function _removeConcentratedPosition(address creditLineToken) private {
        LiquidityPosition storage position = creditLinePositions[creditLineToken];
        
        // Decrease liquidity to zero
        bytes memory decreaseData = abi.encodeWithSelector(
            bytes4(keccak256("decreaseLiquidity((uint256,uint128,uint256,uint256,uint256))")),
            position.concentratedTokenId,
            0, // Remove all liquidity
            0, // amount0Min
            0, // amount1Min
            block.timestamp + 300 // deadline
        );
        
        (bool success,) = POSITION_MANAGER.call(decreaseData);
        require(success, "Failed to decrease concentrated liquidity");
        
        // Burn the NFT
        bytes memory burnData = abi.encodeWithSelector(
            bytes4(keccak256("burn(uint256)")),
            position.concentratedTokenId
        );
        
        (success,) = POSITION_MANAGER.call(burnData);
        require(success, "Failed to burn concentrated position NFT");
        
        position.concentratedTokenId = 0;
    }
    
    /**
     * @notice Add a new concentrated liquidity position at a specific price
     * @param creditLineToken Address of the credit line token
     * @param targetPrice The target price for the concentrated position
     */
    function _addConcentratedPosition(address creditLineToken, uint256 targetPrice) private returns (uint256 tokenId) {
        LiquidityPosition storage position = creditLinePositions[creditLineToken];
        
        // Get token addresses from the position
        address token0 = position.pool < creditLineToken ? position.pool : creditLineToken;
        address token1 = position.pool < creditLineToken ? creditLineToken : position.pool;
        
        // Calculate tick range for concentrated position (narrow range around target price)
        int24 tickSpacing = 100;
        int24 targetTick = _priceToTick(targetPrice);
        int24 tickLower = targetTick - (tickSpacing * 10); // 10 tick spacing range
        int24 tickUpper = targetTick + (tickSpacing * 10);
        
        // Calculate amounts for concentrated position
        uint256 amount0Desired = 1000; // Small amount for concentrated position
        uint256 amount1Desired = 1000;
        
        // Create mint parameters for concentrated position
        MintParams memory params = MintParams({
            token0: token0,
            token1: token1,
            tickSpacing: tickSpacing,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: amount0Desired,
            amount1Desired: amount1Desired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: address(this),
            deadline: block.timestamp + 300,
            sqrtPriceX96: 79228162514264337593543950336 // 1:1 price
        });
        
        // Approve tokens for the position manager
        IERC20(token0).approve(POSITION_MANAGER, amount0Desired);
        IERC20(token1).approve(POSITION_MANAGER, amount1Desired);
        
        // Call position manager to mint concentrated position
        bytes memory mintData = abi.encodeWithSelector(
            bytes4(keccak256("mint((address,address,int24,int24,int24,uint256,uint256,uint256,uint256,address,uint256,uint160))")),
            params
        );
        
        (bool success, bytes memory result) = POSITION_MANAGER.call(mintData);
        
        if (success) {
            (tokenId,,,) = abi.decode(result, (uint256, uint128, uint256, uint256));
            return tokenId;
        } else {
            revert("Failed to add concentrated position");
        }
    }
    
    /**
     * @notice Convert price to tick
     * @param price Price with 18 decimals
     * @return tick The corresponding tick
     */
    function _priceToTick(uint256 price) private pure returns (int24 tick) {
        // This is a simplified conversion - in practice you'd use a more precise formula
        // tick = log(price) / log(1.0001)
        // For now, we'll use a rough approximation
        if (price >= PRICE_PRECISION) {
            tick = int24(uint24((price - PRICE_PRECISION) / (PRICE_PRECISION / 1000000)));
        } else {
            tick = -int24(uint24((PRICE_PRECISION - price) / (PRICE_PRECISION / 1000000)));
        }
    }
    
    // Events
    event InterestAccrued(
        address indexed creditLineToken,
        uint256 oldPrice,
        uint256 newPrice,
        uint256 timeElapsed
    );
}
