// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ICLFactory {
    function createPool(
        address tokenA, 
        address tokenB, 
        int24 tickSpacing, 
        uint160 sqrtPriceX96
    ) external returns (address pool);
}
