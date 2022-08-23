import hardhat from "hardhat";
import { hash, uint256, number } from "starknet";

import { starknet } from "hardhat";

async function main() {
    try {
        const account1 = await hardhat.starknet.deployAccount("OpenZeppelin");
        const account2 = await hardhat.starknet.deployAccount("OpenZeppelin");
        const account3 = await hardhat.starknet.deployAccount("OpenZeppelin");

        console.log("account1", account1.address);
        console.log("account2", account2.address);
        console.log("account3", account3.address);
        const implementationFactory = await hardhat.starknet.getContractFactory(
            "ProxyImplentation"
        );
        const classHash = await implementationFactory.declare();
        console.log("classHash", classHash);

        // const selector = hash.getSelectorFromName("initializer");
        // console.log("selector", selector);

        const proxyFactory = await hardhat.starknet.getContractFactory("proxy");
        const proxy = await proxyFactory.deploy({
            implementation_hash_: number.toFelt(classHash)
        });
        console.log("Deployed to:", proxy.address);

        // eslint-disable-next-line no-warning-comments
        // TODO remove ts-ignore once abi and abiPath are made public
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        proxy.abi = implementationFactory.abi;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        proxy.abiPath = implementationFactory.abiPath;

        const tx1 = await account1.invoke(proxy, "initializer", {
            proxy_admin: account1.address
        });

        console.log("tx1", tx1);

        // const hash1 = await proxy.call("get_implementation_hash");
        // console.log("SA 2", hash1);

        const tx2 = await proxy.call("view_balance");
        console.log("tx2", tx2);

        const su = await proxy.call("view_super_admin");
        console.log("tx2", su);

        await account1.invoke(proxy, "add_admin", {
            admin_address: account1.address
        });

        await account1.invoke(proxy, "add_balance", {
            amount: number.toFelt(10)
        });

        const tx4 = await proxy.call("view_balance");
        console.log("tx4", tx4);

        const implementationFactory2 = await hardhat.starknet.getContractFactory(
            "ProxyImplementation2"
        );
        const classHash2 = await implementationFactory2.declare();
        console.log("classHash", classHash2);

        // eslint-disable-next-line no-warning-comments
        // TODO remove ts-ignore once abi and abiPath are made public
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        proxy.abi = implementationFactory2.abi;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        proxy.abiPath = implementationFactory2.abiPath;

        await account1.invoke(proxy, "upgrade", {
            new_implementation: number.toFelt(classHash2)
        });

        // const hash2 = await proxy.call("get_implementation_hash");
        // console.log("SA 2", hash2);

        const suA = await proxy.call("view_super_admin");
        console.log("SA 2", suA);

        await account1.invoke(proxy, "add_100");

        const tx5 = await proxy.call("view_balance");
        console.log("tx4", tx5);
    } catch (error) {
        console.log(error);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
