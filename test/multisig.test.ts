import { expect } from "chai";
import hardhat from "hardhat";
import { hash, uint256, number } from "starknet";

import { starknet } from "hardhat";
import { TIMEOUT } from "./constants";
import { BN } from "bn.js";

describe("Multisig Contract", function () {
    this.timeout(TIMEOUT);

    let account1: any;
    let account2: any;
    let account3: any;
    let erc20A: any;
    let erc20B: any;
    let contract: any;
    before(async function () {
        account1 = await hardhat.starknet.deployAccount("OpenZeppelin");
        account2 = await hardhat.starknet.deployAccount("OpenZeppelin");
        account3 = await hardhat.starknet.deployAccount("OpenZeppelin");

        console.log("account1", account1.address);
        console.log("account2", account2.address);
        console.log("account3", account3.address);

        const contractFactory = await hardhat.starknet.getContractFactory("Multi_sig");
        contract = await contractFactory.deploy({
            owners: [account1.address, account2.address, account3.address]
        });
        console.log("Deployed to:", contract.address);
        const { res } = await contract.call("num_of_owners");
        console.log("num_of_owners:", res);

        // ----------------------------------------------------------------

        const erc20AFactory = await starknet.getContractFactory("erc20");
        erc20A = await erc20AFactory.deploy({
            name: hardhat.starknet.shortStringToBigInt("ERC20A"),
            symbol: hardhat.starknet.shortStringToBigInt("ERC20A"),
            decimals: 18,
            initial_supply: uint256.bnToUint256(10000000),
            recipient: contract.address
        });

        console.log("erc20A address", erc20A.address);

        let balanceMultiSig: any = 0;
        console.log("MultiSig balance before transfer", balanceMultiSig);
        balanceMultiSig = await account1.call(erc20A, "balanceOf", {
            account: contract.address
        });
        console.log("MultiSig balance after transfer", balanceMultiSig);
    });

    it("should work with 2 confirms", async function () {
        const { balance: prevBal3 } = await account2.call(erc20A, "balanceOf", {
            account: account3.address
        });
        expect(uint256.uint256ToBN(prevBal3)).to.deep.equal(new BN(0));

        const { res: tx_ind } = await contract.call("get_tx_index");
        console.log("tx_ind", tx_ind);

        await account1.invoke(contract, "submit_tx", {
            contract_address: erc20A.address,
            function_selector: hash.getSelectorFromName("transfer"),
            calldata: [number.toFelt(account3.address), number.toFelt(500)]
        });

        await account1.invoke(contract, "comfirm_tx", {
            tx_index: tx_ind
        });
        await account2.invoke(contract, "comfirm_tx", {
            tx_index: tx_ind
        });

        await account3.invoke(contract, "__execute__", {
            tx_index: tx_ind
        });

        const { balance: MBal } = await account2.call(erc20A, "balanceOf", {
            account: contract.address
        });
        console.log("MultiSig balance after execute", MBal);

        const { balance: newBal3 } = await account2.call(erc20A, "balanceOf", {
            account: account3.address
        });
        expect(uint256.uint256ToBN(newBal3)).to.deep.equal(new BN(500));
    });

    it("should work with 3 confirms", async function () {
        const accountA = await hardhat.starknet.deployAccount("OpenZeppelin");
        const accountB = await hardhat.starknet.deployAccount("OpenZeppelin");
        const accountC = await hardhat.starknet.deployAccount("OpenZeppelin");

        console.log("accountA", accountA.address);
        console.log("accountB", accountB.address);
        console.log("accountC", accountC.address);

        const contractFactoryB = await hardhat.starknet.getContractFactory("Multi_sig");
        const contractB = await contractFactoryB.deploy({
            owners: [accountA.address, accountB.address, accountC.address]
        });

        const erc20BFactory = await starknet.getContractFactory("erc20");
        erc20B = await erc20BFactory.deploy({
            name: hardhat.starknet.shortStringToBigInt("ERC20B"),
            symbol: hardhat.starknet.shortStringToBigInt("ERC20B"),
            decimals: 18,
            initial_supply: uint256.bnToUint256(500000),
            recipient: contractB.address
        });

        const { balance: prevBal3 } = await accountB.call(erc20B, "balanceOf", {
            account: accountC.address
        });
        expect(uint256.uint256ToBN(prevBal3)).to.deep.equal(new BN(0));

        const { res: tx_ind } = await contractB.call("get_tx_index");
        console.log("tx_ind---", tx_ind);

        await accountA.invoke(contractB, "submit_tx", {
            contract_address: erc20B.address,
            function_selector: hash.getSelectorFromName("transfer"),
            calldata: [number.toFelt(accountC.address), number.toFelt(500)]
        });

        await accountA.invoke(contractB, "comfirm_tx", {
            tx_index: tx_ind
        });
        await accountB.invoke(contractB, "comfirm_tx", {
            tx_index: tx_ind
        });

        await accountC.invoke(contractB, "comfirm_tx", {
            tx_index: tx_ind
        });

        await accountC.invoke(contractB, "__execute__", {
            tx_index: tx_ind
        });

        const { balance: MBal } = await accountB.call(erc20B, "balanceOf", {
            account: contractB.address
        });
        console.log("MultiSig balance after execute", MBal);

        const { balance: newBal3 } = await accountB.call(erc20B, "balanceOf", {
            account: accountC.address
        });
        expect(uint256.uint256ToBN(newBal3)).to.deep.equal(new BN(500));
    });

    it("should fail if only one confirms", async function () {
        try {
            const { balance: prevBal1 } = await account2.call(erc20A, "balanceOf", {
                account: account1.address
            });
            expect(uint256.uint256ToBN(prevBal1)).to.deep.equal(new BN(0));

            const { res: tx_ind } = await contract.call("get_tx_index");
            console.log("tx_ind", tx_ind);

            await account1.invoke(contract, "submit_tx", {
                contract_address: erc20A.address,
                function_selector: hash.getSelectorFromName("transfer"),
                calldata: [number.toFelt(account1.address), number.toFelt(500)]
            });

            await account1.invoke(contract, "comfirm_tx", {
                tx_index: tx_ind
            });

            await account3.invoke(contract, "__execute__", {
                tx_index: tx_ind
            });

            expect.fail("Transaction rejected. Error message:");
        } catch (error: any) {
            expect(error.message).to.include("Transaction rejected");
        }
    });

    it("should fail if unregistered account submit transactions", async function () {
        const account4 = await hardhat.starknet.deployAccount("OpenZeppelin");

        try {
            const { res: tx_ind } = await contract.call("get_tx_index");
            console.log("tx_ind", tx_ind);

            await account4.invoke(contract, "submit_tx", {
                contract_address: erc20A.address,
                function_selector: hash.getSelectorFromName("transfer"),
                calldata: [number.toFelt(account1.address), number.toFelt(500)]
            });

            // await account1.invoke(contract, "comfirm_tx", {
            //     tx_index: tx_ind
            // });

            // await account3.invoke(contract, "__execute__", {
            //     tx_index: tx_ind
            // });

            expect.fail("Transaction rejected. Error message:");
        } catch (error: any) {
            expect(error.message).to.include("Transaction rejected");
        }
    });
});
