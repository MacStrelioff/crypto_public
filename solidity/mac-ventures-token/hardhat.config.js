require("@nomicfoundation/hardhat-toolbox");
require("@nomiclabs/hardhat-etherscan");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.17",
  networks: {
    // get from Alchemy at https://dashboard.alchemy.com/apps
    goerli: {
      // get test eth from https://goerlifaucet.com/
      url: process.env.ALCHEMY_GOERLI_ENDPOINT,
      accounts: [process.env.PRIVATE_KEY_DEPLOYER]
    },
    mainnet: {
      url: process.env.ALCHEMY_MAINNET_ENDPOINT,
      accounts: [process.env.PRIVATE_KEY_DEPLOYER]
    }
  },
  etherscan: {
    // Obtain one at https://etherscan.io/myapikey
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
