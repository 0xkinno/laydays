import { defineConfig } from "hardhat/config";

export default defineConfig({
  paths: { sources: "./contracts/src", tests: { solidity: "./contracts/test" } },
  solidity: {
    version: "0.8.28",
    settings: { optimizer: { enabled: true, runs: 200 }, evmVersion: "cancun" },
  },
  test: { solidity: { fuzz: { runs: 256 } } },
});
