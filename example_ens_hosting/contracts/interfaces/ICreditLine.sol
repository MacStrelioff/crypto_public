// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICreditLine {
    // Events
    event CreditLineCreated(
        address indexed underlyingAsset,
        uint256 creditLimit,
        uint256 apy,
        uint256 initialLiquidity,
        address fullRangePool,
        address concentratedPool
    );
    
    event CreditWithdrawn(address indexed borrower, uint256 amount);
    event InterestAccrued(uint256 newPrice);
    event CreditLimitUpdated(uint256 newLimit);

    // Structs
    struct CreditLineParams {
        address underlyingAsset;
        uint256 creditLimit;
        uint256 apy; // in basis points (1% = 100)
        uint256 initialLiquidity;
    }

    // Functions
    function initialize(CreditLineParams calldata params, address _borrower) external;
    function withdrawCredit(uint256 amount) external;
    function accrueInterest() external;
    function updateCreditLimit(uint256 newLimit) external;
    
    // View functions
    function getUnderlyingAsset() external view returns (address);
    function getCreditLimit() external view returns (uint256);
    function getApy() external view returns (uint256);
    function getFullRangePool() external view returns (address);
    function getConcentratedPool() external view returns (address);
    function getBorrower() external view returns (address);
}
