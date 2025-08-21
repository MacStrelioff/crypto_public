// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../CreditLineToken.sol";

/**
 * @title MockAerodromeAdapter
 * @notice Mock adapter for testing credit line functionality without real Aerodrome contracts
 */
contract MockAerodromeAdapter is Ownable, ReentrancyGuard {
    
    // Mock addresses
    address public constant CL_FACTORY = address(0x1234567890123456789012345678901234567890);
    address public constant POSITION_MANAGER = address(0x1234567890123456789012345678901234567891);
    
    // Mapping to track authorized callers
    mapping(address => bool) public authorizedCallers;
    
    // Mock position tracking
    mapping(address => LiquidityPosition) public creditLinePositions;
    
    struct LiquidityPosition {
        uint256 fullRangeTokenId;
        uint256 concentratedTokenId;
        address pool;
        bool exists;
    }
    
    // Events
    event PoolCreated(address indexed pool, address token0, address token1, int24 tickSpacing);
    event LiquidityPositionCreated(uint256 indexed tokenId, address indexed pool, uint128 liquidity);
    event InterestAccrued(address indexed creditLineToken, uint256 apy, uint256 timeElapsed, uint256 newPrice);
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @notice Authorize a caller (like a factory) to call restricted functions
     */
    function setAuthorizedCaller(address caller, bool authorized) external onlyOwner {
        authorizedCallers[caller] = authorized;
    }
    
    /**
     * @notice Mock function to create a liquidity pool and add initial liquidity
     */
    function createPoolAndAddLiquidity(
        address creditLineToken,
        address underlyingAsset,
        uint256 amount0,
        uint256 amount1
    ) external returns (address pool, uint256 fullRangeTokenId) {
        require(msg.sender == owner() || authorizedCallers[msg.sender], "Unauthorized caller");
        
        // Create a mock pool address
        pool = address(uint160(uint256(keccak256(abi.encodePacked(creditLineToken, underlyingAsset, block.timestamp)))));
        
        // Create mock token IDs
        fullRangeTokenId = uint256(keccak256(abi.encodePacked("fullRange", creditLineToken, block.timestamp)));
        uint256 concentratedTokenId = uint256(keccak256(abi.encodePacked("concentrated", creditLineToken, block.timestamp)));
        
        // Store the position
        creditLinePositions[creditLineToken] = LiquidityPosition({
            fullRangeTokenId: fullRangeTokenId,
            concentratedTokenId: concentratedTokenId,
            pool: pool,
            exists: true
        });
        
        emit PoolCreated(pool, creditLineToken, underlyingAsset, 60);
        emit LiquidityPositionCreated(fullRangeTokenId, pool, uint128(amount0 + amount1));
        
        return (pool, fullRangeTokenId);
    }
    
    /**
     * @notice Mock function to accrue interest
     */
    function accrueInterest(
        address creditLineToken,
        uint256 apy,
        uint256 timeElapsed
    ) external returns (uint256 newPrice) {
        require(msg.sender == owner() || authorizedCallers[msg.sender], "Unauthorized caller");
        require(creditLinePositions[creditLineToken].exists, "Position does not exist");
        
        // Mock interest calculation: new price = 1.0 + (apy * timeElapsed / 365 days)
        uint256 basePrice = 1e18; // 1.0 in 18 decimals
        uint256 interestRate = (apy * timeElapsed * 1e18) / (365 days * 10000); // apy in basis points
        newPrice = basePrice + interestRate;
        
        emit InterestAccrued(creditLineToken, apy, timeElapsed, newPrice);
        
        // Update the credit line token's last accrual time
        CreditLineToken(creditLineToken).updateLastAccrualTime(block.timestamp);
        
        return newPrice;
    }
    
    /**
     * @notice Get stored position for a credit line
     */
    function getPosition(address creditLineToken) external view returns (LiquidityPosition memory) {
        return creditLinePositions[creditLineToken];
    }
    
    /**
     * @notice Mock function to remove liquidity
     */
    function removeLiquidity(
        address creditLineToken,
        uint128 liquidity
    ) external returns (uint256 amount0, uint256 amount1) {
        require(msg.sender == owner() || authorizedCallers[msg.sender], "Unauthorized caller");
        require(creditLinePositions[creditLineToken].exists, "Position does not exist");
        
        // Mock return values
        amount0 = uint256(liquidity) / 2;
        amount1 = uint256(liquidity) / 2;
        
        return (amount0, amount1);
    }
    
    /**
     * @notice Mock function to collect fees
     */
    function collectFees(
        address creditLineToken,
        address recipient
    ) external returns (uint256 amount0, uint256 amount1) {
        require(msg.sender == owner() || authorizedCallers[msg.sender], "Unauthorized caller");
        require(creditLinePositions[creditLineToken].exists, "Position does not exist");
        
        // Mock fee collection
        amount0 = 0;
        amount1 = 0;
        
        return (amount0, amount1);
    }
    
    /**
     * @notice Emergency function to recover tokens
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    /**
     * @notice Emergency function to recover ETH
     */
    function emergencyWithdrawETH() external onlyOwner {
        (bool success,) = owner().call{value: address(this).balance}("");
        require(success, "ETH transfer failed");
    }
    
    /**
     * @notice Receive ETH
     */
    receive() external payable {}
}
