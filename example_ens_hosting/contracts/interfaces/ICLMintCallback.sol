// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICLMintCallback {
    function uniswapV3MintCallback(uint256 amount0Owed, uint256 amount1Owed, bytes calldata data) external;
}
