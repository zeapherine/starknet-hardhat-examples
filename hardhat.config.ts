import { HardhatUserConfig } from "hardhat/types";
import "@shardlabs/starknet-hardhat-plugin";
import "@nomiclabs/hardhat-ethers";

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
const config: HardhatUserConfig = {
    solidity: "0.6.12",
    starknet: {
        // dockerizedVersion: "0.8.2-arm", // alternatively choose one of the two venv options below
        // uses (my-venv) defined by `python -m venv path/to/my-venv`
        // venv: "path/to/my-venv",

        // uses the currently active Python environment (hopefully with available Starknet commands!)
        venv: "active",
        network: "devnet",
        wallets: {
            OpenZeppelin1: {
                accountName: "OpenZeppelin1",
                modulePath: "starkware.starknet.wallets.open_zeppelin.OpenZeppelinAccount",
                accountPath: "~/.starknet_accounts"
            },
            OpenZeppelin2: {
                accountName: "OpenZeppelin2",
                modulePath: "starkware.starknet.wallets.open_zeppelin.OpenZeppelinAccount",
                accountPath: "~/.starknet_accounts"
            },
            OpenZeppelin3: {
                accountName: "OpenZeppelin3",
                modulePath: "starkware.starknet.wallets.open_zeppelin.OpenZeppelinAccount",
                accountPath: "~/.starknet_accounts"
            }
        }
    },
    networks: {
        devnet: {
            url: "http://127.0.0.1:5050"
        },
        integratedDevnet: {
            url: "http://127.0.0.1:5050",
            // venv: "active",
            dockerizedVersion: "0.2.2"
        },
        hardhat: {}
    },
    paths: {
        cairoPaths: ["./node_modules/@influenceth/cairo-math-64x61"]
    }
};

export default config;
