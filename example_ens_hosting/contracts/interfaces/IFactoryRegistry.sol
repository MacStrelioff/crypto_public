// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IFactoryRegistry {
    function factoriesToPoolFactory(address factory) external view returns (address poolFactory, address gaugeFactory);
    function poolFactory() external view returns (address);
    function gaugeFactory() external view returns (address);
}
