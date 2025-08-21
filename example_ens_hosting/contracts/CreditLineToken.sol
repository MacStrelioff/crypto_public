// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./AerodromeAdapter.sol";

/**
 * @title CreditLineToken
 * @notice A simplified ERC20 token for credit lines that focuses on core functionality
 * @dev This contract handles the basic credit line logic and can validate prices with Aerodrome
 */
contract CreditLineToken is ERC20, Ownable, ReentrancyGuard {
    
    // Credit line parameters
    address public underlyingAsset;
    uint256 public creditLimit;
    uint256 public apy; // in basis points (e.g., 500 = 5%)
    address public borrower;
    
    // Liquidity tracking (simplified)
    uint256 public totalLiquidityProvided;
    uint256 public totalLiquidityWithdrawn;
    
    // Aerodrome integration
    AerodromeAdapter public aerodromeAdapter;
    bool public priceValidationEnabled;
    
    // Interest accrual tracking
    uint256 public lastAccrualTime;
    
    // Struct for credit line status
    struct CreditLineStatus {
        address underlyingAsset;
        uint256 creditLimit;
        uint256 apy;
        address borrower;
        uint256 totalProvided;
        uint256 totalWithdrawn;
        uint256 availableLiquidity;
        uint256 lastAccrualTime;
    }
    
    // Events
    event CreditLineInitialized(
        address indexed underlyingAsset,
        uint256 creditLimit,
        uint256 apy,
        address indexed borrower
    );
    
    event LiquidityProvided(
        address indexed provider,
        uint256 amount,
        uint256 timestamp
    );
    
    event LiquidityWithdrawn(
        address indexed borrower,
        uint256 amount,
        uint256 timestamp
    );
    
    event CreditLimitUpdated(
        uint256 oldLimit,
        uint256 newLimit
    );
    
    event APYUpdated(
        uint256 oldAPY,
        uint256 newAPY
    );
    
    event PriceValidationUpdated(
        bool enabled,
        address indexed adapter
    );
    
    // Errors
    error CreditLineAlreadyInitialized();
    error CreditLineNotInitialized();
    error InsufficientLiquidity();
    error UnauthorizedBorrower();
    error InvalidParameters();
    error ZeroAmount();
    error PriceValidationFailed();
    
    /**
     * @notice Constructor for the credit line token
     * @param name Token name
     * @param symbol Token symbol
     */
    constructor(
        string memory name,
        string memory symbol
    ) ERC20(name, symbol) Ownable(msg.sender) {}
    
    /**
     * @notice Initialize the credit line with parameters
     * @param _underlyingAsset Address of the underlying asset (e.g., WETH)
     * @param _creditLimit Maximum amount that can be borrowed
     * @param _apy Annual percentage yield in basis points
     * @param _borrower Address of the borrower
     * @param _initialLiquidity Initial liquidity to provide
     */
    function initialize(
        address _underlyingAsset,
        uint256 _creditLimit,
        uint256 _apy,
        address _borrower,
        uint256 _initialLiquidity
    ) external onlyOwner {
        if (borrower != address(0)) {
            revert CreditLineAlreadyInitialized();
        }
        
        if (_underlyingAsset == address(0) || _borrower == address(0)) {
            revert InvalidParameters();
        }
        
        if (_initialLiquidity == 0) {
            revert ZeroAmount();
        }
        
        // Set credit line parameters
        underlyingAsset = _underlyingAsset;
        creditLimit = _creditLimit;
        apy = _apy;
        borrower = _borrower;
        lastAccrualTime = block.timestamp; // Set initial accrual time
        
        // Note: Minting will be done separately by the factory
        
        // Track initial liquidity
        totalLiquidityProvided = _initialLiquidity;
        
        emit CreditLineInitialized(
            _underlyingAsset,
            _creditLimit,
            _apy,
            _borrower
        );
        
        emit LiquidityProvided(address(this), _initialLiquidity, block.timestamp);
    }
    
    /**
     * @notice Set the Aerodrome adapter for price validation
     * @param _adapter Address of the Aerodrome adapter
     * @param _enabled Whether to enable price validation
     */
    function setPriceValidation(address _adapter, bool _enabled) external onlyOwner {
        if (_enabled && _adapter == address(0)) {
            revert InvalidParameters();
        }
        
        aerodromeAdapter = AerodromeAdapter(_adapter);
        priceValidationEnabled = _enabled;
        
        emit PriceValidationUpdated(_enabled, _adapter);
    }
    
    /**
     * @notice Allow the borrower to withdraw underlying assets
     * @param amount Amount to withdraw
     */
    function withdrawCredit(uint256 amount) external nonReentrant {
        if (borrower == address(0)) {
            revert CreditLineNotInitialized();
        }
        
        if (msg.sender != borrower) {
            revert UnauthorizedBorrower();
        }
        
        if (amount == 0) {
            revert ZeroAmount();
        }
        
        if (amount > creditLimit) {
            revert InsufficientLiquidity();
        }
        
        // Check if we have enough underlying asset
        uint256 underlyingBalance = IERC20(underlyingAsset).balanceOf(address(this));
        if (amount > underlyingBalance) {
            revert InsufficientLiquidity();
        }
        
        // Transfer underlying asset to borrower
        IERC20(underlyingAsset).transfer(borrower, amount);
        
        // Track withdrawal
        totalLiquidityWithdrawn += amount;
        
        emit LiquidityWithdrawn(borrower, amount, block.timestamp);
    }
    
    /**
     * @notice Update the credit limit (only owner)
     * @param newLimit New credit limit
     */
    function updateCreditLimit(uint256 newLimit) external onlyOwner {
        if (borrower == address(0)) {
            revert CreditLineNotInitialized();
        }
        
        uint256 oldLimit = creditLimit;
        creditLimit = newLimit;
        
        emit CreditLimitUpdated(oldLimit, newLimit);
    }
    
    /**
     * @notice Update the APY (only owner)
     * @param newAPY New APY in basis points
     */
    function updateAPY(uint256 newAPY) external onlyOwner {
        if (borrower == address(0)) {
            revert CreditLineNotInitialized();
        }
        
        uint256 oldAPY = apy;
        apy = newAPY;
        
        emit APYUpdated(oldAPY, newAPY);
    }
    
    /**
     * @notice Get current credit line status
     * @return status The credit line status information
     */
    function getCreditLineStatus() external view returns (CreditLineStatus memory status) {
        status.underlyingAsset = underlyingAsset;
        status.creditLimit = creditLimit;
        status.apy = apy;
        status.borrower = borrower;
        status.totalProvided = totalLiquidityProvided;
        status.totalWithdrawn = totalLiquidityWithdrawn;
        status.availableLiquidity = IERC20(underlyingAsset).balanceOf(address(this));
        status.lastAccrualTime = lastAccrualTime;
    }
    
    /**
     * @notice Emergency function to recover tokens (only owner)
     * @param token Address of token to recover
     * @param amount Amount to recover
     */
    function emergencyWithdraw(address token, uint256 amount) external onlyOwner {
        IERC20(token).transfer(owner(), amount);
    }
    
    /**
     * @notice Override transfer to add basic validation
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return bool Success status
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        _validateInterestAccrual();
        return super.transfer(to, amount);
    }
    
    /**
     * @notice Override transferFrom to add basic validation
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     * @return bool Success status
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        _validateInterestAccrual();
        return super.transferFrom(from, to, amount);
    }
    
    /**
     * @notice Validate that interest has been properly accrued before transfers
     * @param tolerance Price tolerance in basis points (e.g., 100 = 1%)
     * @return isValid Whether the interest has been properly accrued
     * @return currentPrice The current pool price
     * @return expectedPrice The expected price based on APY and time
     */
    function validateInterestAccrual(uint256 tolerance) external view returns (bool isValid, uint256 currentPrice, uint256 expectedPrice) {
        if (!priceValidationEnabled || address(aerodromeAdapter) == address(0)) {
            return (true, 0, 0); // Skip validation if not enabled
        }
        
        // Get the current pool price
        try aerodromeAdapter.getCurrentPoolPrice(
            aerodromeAdapter.getPosition(address(this)).pool
        ) returns (uint256 price) {
            currentPrice = price;
        } catch {
            return (false, 0, 0); // Can't get pool price
        }
        
        // Calculate expected price based on APY and time since initialization
        // This is a simplified calculation - in practice you'd track last accrual time
        uint256 timeElapsed = block.timestamp - lastAccrualTime;
        uint256 interestRate = (apy * timeElapsed * 1e18) / (365 days * 10000);
        expectedPrice = 1e18 + interestRate; // Start at 1:1 price
        
        // Check if the price difference is within tolerance
        uint256 priceDifference = currentPrice > expectedPrice ? 
            currentPrice - expectedPrice : expectedPrice - currentPrice;
        
        uint256 toleranceAmount = (expectedPrice * tolerance) / 10000;
        isValid = priceDifference <= toleranceAmount;
        
        return (isValid, currentPrice, expectedPrice);
    }
    
    /**
     * @notice Check if interest accrual is needed
     * @return needsAccrual Whether interest accrual is needed
     * @return timeSinceLastAccrual Time since last accrual in seconds
     */
    function checkInterestAccrual() external view returns (bool needsAccrual, uint256 timeSinceLastAccrual) {
        timeSinceLastAccrual = block.timestamp - lastAccrualTime;
        (bool isValid,,) = this.validateInterestAccrual(100); // 1% tolerance
        needsAccrual = !isValid;
        return (needsAccrual, timeSinceLastAccrual);
    }

    /**
     * @notice Update the last accrual time (called by factory after interest accrual)
     * @param newAccrualTime The new accrual time
     */
    function updateLastAccrualTime(uint256 newAccrualTime) external {
        // Only the factory or adapter can update this
        require(msg.sender == address(aerodromeAdapter) || msg.sender == owner(), "Unauthorized");
        lastAccrualTime = newAccrualTime;
    }
    
    /**
     * @notice Approve the AerodromeAdapter to spend tokens (called by factory)
     * @param adapter Address of the AerodromeAdapter
     * @param amount Amount to approve
     */
    function approveAdapter(address adapter, uint256 amount) external onlyOwner {
        _approve(address(this), adapter, amount);
    }
    
    /**
     * @notice Approve the AerodromeAdapter to spend underlying asset (called by factory)
     * @param adapter Address of the AerodromeAdapter
     * @param amount Amount to approve
     */
    function approveAdapterForUnderlying(address adapter, uint256 amount) external onlyOwner {
        IERC20(underlyingAsset).approve(adapter, amount);
    }
    
    /**
     * @notice Validate interest accrual before transfers
     */
    function _validateInterestAccrual() private view {
        if (priceValidationEnabled && address(aerodromeAdapter) != address(0)) {
            (bool isValid,,) = this.validateInterestAccrual(100); // 1% tolerance
            if (!isValid) {
                revert PriceValidationFailed();
            }
        }
    }
    
    /**
     * @notice Mint tokens (only owner can call this)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
}
