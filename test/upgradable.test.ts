import { expect } from "chai";
import hardhat from "hardhat";
import { hash, uint256, number } from "starknet";

import { starknet } from "hardhat";
import { TIMEOUT } from "./constants";
import { BN } from "bn.js";

describe("Upgradable Proxy contract", function () {
    this.timeout(TIMEOUT);

    let account1: any;
    let account2: any;
    let account3: any;
    let proxy: any;

    before(async function () {
        account1 = await hardhat.starknet.deployAccount("OpenZeppelin");
        account2 = await hardhat.starknet.deployAccount("OpenZeppelin");
        account3 = await hardhat.starknet.deployAccount("OpenZeppelin");

        console.log("account1", account1.address);
        console.log("account2", account2.address);
        console.log("account3", account3.address);

        const implementationFactory = await hardhat.starknet.getContractFactory(
            "ProxyImplentation"
        );
        const classHash = await implementationFactory.declare();
        console.log("classHash", classHash);

        const proxyFactory = await hardhat.starknet.getContractFactory("proxy");
        proxy = await proxyFactory.deploy({
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

        await account1.invoke(proxy, "initializer", {
            proxy_admin: account1.address
        });
    });

    it("should fail to add balance if not super user", async function () {
        try {
            await account2.invoke(proxy, "add_balance", {
                amount: number.toFelt(10)
            });

            expect.fail("Transaction rejected. Error message:");
        } catch (error: any) {
            expect(error.message).to.include("Only admin can add balance");
        }
    });

    it("should fail to add admins if not super user", async function () {
        try {
            await account2.invoke(proxy, "add_admin", {
                admin_address: account1.address
            });

            expect.fail("Transaction rejected. Error message:");
        } catch (error: any) {
            expect(error.message).to.include("Only super admin can add admin");
        }
    });

    it("should fail to transfer admin role if not existing admin", async function () {
        try {
            await account2.invoke(proxy, "transfer_admin_role", {
                new_admin_address: account1.address
            });

            expect.fail("Transaction rejected. Error message:");
        } catch (error: any) {
            expect(error.message).to.include(
                "Error message: Only existing admin can transfer admin role"
            );
        }
    });

    it("should fail to renounce admin role if not existing admin", async function () {
        try {
            await account2.invoke(proxy, "renounce_admin_role");

            expect.fail("Transaction rejected. Error message:");
        } catch (error: any) {
            expect(error.message).to.include("Transaction rejected. Error message:");
        }
    });

    it("should fail to remove admin role if not super admin", async function () {
        try {
            await account2.invoke(proxy, "remove_admin", {
                admin_address: account1.address
            });

            expect.fail("Transaction rejected. Error message:");
        } catch (error: any) {
            expect(error.message).to.include("Error message: Only super admin can remove admin");
        }
    });

    it("should add admin role and call add_balance", async function () {
        await account1.invoke(proxy, "add_admin", {
            admin_address: account1.address
        });

        await account1.invoke(proxy, "add_balance", {
            amount: number.toFelt(300)
        });

        const balance = await proxy.call("view_balance");

        expect(balance).to.deep.equal({ balance: 300n });
    });

    it("should remove admin role and fail at call add_balance", async function () {
        await account1.invoke(proxy, "remove_admin", {
            admin_address: account1.address
        });

        try {
            await account1.invoke(proxy, "add_balance", {
                amount: number.toFelt(300)
            });

            expect.fail("Transaction rejected. Error message:");
        } catch (error: any) {
            expect(error.message).to.include("Error message: Only admin can add balance");
        }
    });

    it("should transfer admin role ", async function () {
        await account1.invoke(proxy, "add_admin", {
            admin_address: account1.address
        });
        await account1.invoke(proxy, "transfer_admin_role", {
            new_admin_address: account2.address
        });

        await account2.invoke(proxy, "add_balance", {
            amount: number.toFelt(300)
        });

        const balance = await proxy.call("view_balance");

        expect(balance).to.deep.equal({ balance: 600n });
    });

    it("should renounce admin role and fail at call to add_balance", async function () {
        await account2.invoke(proxy, "renounce_admin_role");

        try {
            await account2.invoke(proxy, "add_balance", {
                amount: number.toFelt(300)
            });

            expect.fail("Transaction rejected. Error message:");
        } catch (error: any) {
            expect(error.message).to.include("Error message: Only admin can add balance");
        }
    });

    it("should upgrade to ProxyImplementation2 contract, and call add_100", async function () {
        const implementationFactory2 = await hardhat.starknet.getContractFactory(
            "ProxyImplementation2"
        );

        const classHash2 = await implementationFactory2.declare();
        await account1.invoke(proxy, "upgrade", {
            new_implementation: number.toFelt(classHash2)
        });

        // eslint-disable-next-line no-warning-comments
        // TODO remove ts-ignore once abi and abiPath are made public
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        proxy.abi = implementationFactory2.abi;
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        proxy.abiPath = implementationFactory2.abiPath;

        await account1.invoke(proxy, "add_100");

        const balance = await proxy.call("view_balance");

        expect(balance).to.deep.equal({ balance: 700n });
    });
});
