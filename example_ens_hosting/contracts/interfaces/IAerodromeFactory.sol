// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IAerodromeFactory {
    function createPool(address tokenA, address tokenB, bool stable) external returns (address pool);
    function getPool(address tokenA, address tokenB, bool stable) external view returns (address pool);
}
