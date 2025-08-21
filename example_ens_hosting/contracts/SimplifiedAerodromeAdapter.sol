// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./CreditLineToken.sol";

/**
 * @title SimplifiedAerodromeAdapter
 * @notice Simplified adapter that leverages Aerodrome's Position Manager directly
 * @dev This adapter uses Aerodrome's built-in functionality instead of reimplementing it
 */
contract SimplifiedAerodromeAdapter is Ownable, ReentrancyGuard {
    
    // Aerodrome addresses (Base Mainnet)
    address public constant CL_FACTORY = 0x5e7BB104d84c7CB9B682AaC2F3d509f5F406809A;
    address public constant POSITION_MANAGER = 0x827922686190790b37229fd06084350E74485b72;
    
    // Constants for tick calculations
    int24 private constant MIN_TICK = -887272;
    int24 private constant MAX_TICK = 887272;
    
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
    
    // Events
    event PoolCreated(address indexed pool, address token0, address token1, int24 tickSpacing);
    event LiquidityPositionCreated(uint256 indexed tokenId, address indexed pool, uint128 liquidity);
    event LiquidityPositionRemoved(uint256 indexed tokenId, uint256 amount0, uint256 amount1);
    event FeesCollected(uint256 indexed tokenId, uint256 amount0, uint256 amount1);
    event InterestAccrued(address indexed creditLineToken, uint256 oldPrice, uint256 newPrice, uint256 timeElapsed);
    
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
        
        // Sort tokens and amounts
        (address token0, address token1, uint256 amount0Desired, uint256 amount1Desired) = _sortTokensAndAmounts(
            creditLineToken, underlyingAsset, amount0, amount1
        );
        
        // Transfer and approve tokens
        _transferAndApproveTokens(token0, token1, amount0Desired, amount1Desired, creditLineToken);
        
        // Mint position
        fullRangeTokenId = _mintPosition(token0, token1, amount0Desired, amount1Desired);
        
        // Get pool address
        pool = _getPoolAddress(token0, token1);
        
        // Store position
        _storePosition(creditLineToken, fullRangeTokenId, pool);
        
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
            abi.encode(
                position.fullRangeTokenId,
                liquidity,
                0, // amount0Min
                0, // amount1Min
                block.timestamp + 300 // deadline
            )
        );
        
        (bool success, bytes memory result) = POSITION_MANAGER.call(decreaseData);
        require(success, "Position manager decrease liquidity failed");
        
        (amount0, amount1) = abi.decode(result, (uint256, uint256));
        emit LiquidityPositionRemoved(position.fullRangeTokenId, amount0, amount1);
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
            abi.encode(
                position.fullRangeTokenId,
                recipient,
                type(uint128).max, // amount0Max
                type(uint128).max  // amount1Max
            )
        );
        
        (bool success, bytes memory result) = POSITION_MANAGER.call(collectData);
        require(success, "Position manager collect failed");
        
        (amount0, amount1) = abi.decode(result, (uint256, uint256));
        emit FeesCollected(position.fullRangeTokenId, amount0, amount1);
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
    
    // Helper functions
    
    /**
     * @notice Sort tokens and amounts for Aerodrome
     */
    function _sortTokensAndAmounts(
        address creditLineToken,
        address underlyingAsset,
        uint256 amount0,
        uint256 amount1
    ) private pure returns (address token0, address token1, uint256 amount0Desired, uint256 amount1Desired) {
        (token0, token1) = creditLineToken < underlyingAsset 
            ? (creditLineToken, underlyingAsset) 
            : (underlyingAsset, creditLineToken);
        
        (amount0Desired, amount1Desired) = creditLineToken < underlyingAsset 
            ? (amount0, amount1) 
            : (amount1, amount0);
    }
    
    /**
     * @notice Transfer and approve tokens
     */
    function _transferAndApproveTokens(
        address token0,
        address token1,
        uint256 amount0Desired,
        uint256 amount1Desired,
        address creditLineToken
    ) private {
        // Check balances before transfer
        uint256 token0BalanceBefore = IERC20(token0).balanceOf(creditLineToken);
        uint256 token1BalanceBefore = IERC20(token1).balanceOf(creditLineToken);
        require(token0BalanceBefore >= amount0Desired, "Insufficient token0 balance in credit line");
        require(token1BalanceBefore >= amount1Desired, "Insufficient token1 balance in credit line");
        
        // Check allowances
        uint256 token0Allowance = IERC20(token0).allowance(creditLineToken, address(this));
        uint256 token1Allowance = IERC20(token1).allowance(creditLineToken, address(this));
        require(token0Allowance >= amount0Desired, "Insufficient token0 allowance");
        require(token1Allowance >= amount1Desired, "Insufficient token1 allowance");
        
        IERC20(token0).transferFrom(creditLineToken, address(this), amount0Desired);
        IERC20(token1).transferFrom(creditLineToken, address(this), amount1Desired);
        
        // Verify we received the tokens
        uint256 token0BalanceAfter = IERC20(token0).balanceOf(address(this));
        uint256 token1BalanceAfter = IERC20(token1).balanceOf(address(this));
        require(token0BalanceAfter >= amount0Desired, "Token0 transfer failed");
        require(token1BalanceAfter >= amount1Desired, "Token1 transfer failed");
        
        IERC20(token0).approve(POSITION_MANAGER, amount0Desired);
        IERC20(token1).approve(POSITION_MANAGER, amount1Desired);
        
        // Verify approvals
        uint256 token0ApprovalAfter = IERC20(token0).allowance(address(this), POSITION_MANAGER);
        uint256 token1ApprovalAfter = IERC20(token1).allowance(address(this), POSITION_MANAGER);
        require(token0ApprovalAfter >= amount0Desired, "Token0 approval failed");
        require(token1ApprovalAfter >= amount1Desired, "Token1 approval failed");
    }
    
    /**
     * @notice Mint position
     */
    function _mintPosition(
        address token0,
        address token1,
        uint256 amount0Desired,
        uint256 amount1Desired
    ) private returns (uint256 tokenId) {
        int24 tickSpacing = 100;
        
        // Create MintParams struct
        bytes memory mintCall = abi.encodeWithSelector(
            bytes4(keccak256("mint((address,address,int24,int24,int24,uint256,uint256,uint256,uint256,address,uint256,uint160))")),
            token0,
            token1,
            tickSpacing,
            getMinTick(tickSpacing),
            getMaxTick(tickSpacing),
            amount0Desired,
            amount1Desired,
            0, // amount0Min
            0, // amount1Min
            address(this), // recipient
            block.timestamp + 300, // deadline
            uint160(79228162514264337593543950336) // 1:1 price in sqrtPriceX96
        );
        
        (bool success, bytes memory result) = POSITION_MANAGER.call(mintCall);
        if (!success) {
            // Try to decode the error message
            if (result.length > 0) {
                // Try to decode as a string first
                try this.decodeRevertReason(result) returns (string memory reason) {
                    revert(string(abi.encodePacked("Position manager mint failed: ", reason)));
                } catch {
                    // If string decoding fails, show raw bytes
                    revert("Position manager mint failed with unknown error");
                }
            } else {
                revert("Position manager mint failed with no error message");
            }
        }
        
        (tokenId,,,) = abi.decode(result, (uint256, uint128, uint256, uint256));
    }
    
    /**
     * @notice Get pool address
     */
    function _getPoolAddress(address token0, address token1) private returns (address pool) {
        int24 tickSpacing = 100;
        
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
    }
    
    /**
     * @notice Store position information
     */
    function _storePosition(address creditLineToken, uint256 fullRangeTokenId, address pool) private {
        creditLinePositions[creditLineToken] = LiquidityPosition({
            fullRangeTokenId: fullRangeTokenId,
            concentratedTokenId: 0, // We'll add this later
            pool: pool,
            exists: true
        });
        
        int24 tickSpacing = 100;
        emit PoolCreated(pool, creditLineToken, address(0), tickSpacing);
        emit LiquidityPositionCreated(fullRangeTokenId, pool, 0);
    }
    
    /**
     * @notice Get minimum tick for a given tick spacing
     * @param tickSpacing The tick spacing
     * @return The minimum tick
     */
    function getMinTick(int24 tickSpacing) private pure returns (int24) {
        return (MIN_TICK / tickSpacing) * tickSpacing;
    }
    
    /**
     * @notice Get maximum tick for a given tick spacing
     * @param tickSpacing The tick spacing
     * @return The maximum tick
     */
    function getMaxTick(int24 tickSpacing) private pure returns (int24) {
        return (MAX_TICK / tickSpacing) * tickSpacing;
    }
    
    /**
     * @notice Helper function to decode revert reason
     * @param revertData The revert data from a failed call
     * @return reason The decoded revert reason
     */
    function decodeRevertReason(bytes memory revertData) external pure returns (string memory reason) {
        // Check if it's a standard revert with a reason string
        if (revertData.length >= 68) {
            // 4 bytes for selector + 32 bytes for offset + 32 bytes for length + string data
            bytes4 selector = bytes4(revertData);
            if (selector == 0x08c379a0) { // Error(string) selector
                // Skip the selector (4 bytes) and offset (32 bytes)
                assembly {
                    revertData := add(revertData, 68)
                }
                reason = abi.decode(revertData, (string));
            }
        }
        
        if (bytes(reason).length == 0) {
            reason = "Unknown error";
        }
    }

}
