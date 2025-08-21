// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MockAerodromeFactory {
    mapping(address => mapping(address => mapping(bool => address))) public getPool;
    
    event PoolCreated(address indexed token0, address indexed token1, bool indexed stable, address pool, uint256);
    
    function createPool(address tokenA, address tokenB, bool stable) external returns (address pool) {
        // Create a deterministic pool address
        pool = address(uint160(uint256(keccak256(abi.encodePacked(tokenA, tokenB, stable, block.timestamp)))));
        
        // Store the pool address
        getPool[tokenA][tokenB][stable] = pool;
        getPool[tokenB][tokenA][stable] = pool;
        
        emit PoolCreated(tokenA, tokenB, stable, pool, 0);
        
        return pool;
    }
}
