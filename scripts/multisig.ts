import hardhat from "hardhat";
import { hash, uint256, number } from "starknet";

import { starknet } from "hardhat";

async function main() {
    const account1 = await hardhat.starknet.deployAccount("OpenZeppelin");
    const account2 = await hardhat.starknet.deployAccount("OpenZeppelin");
    const account3 = await hardhat.starknet.deployAccount("OpenZeppelin");

    console.log("account1", account1.address);
    console.log("account2", account2.address);
    console.log("account3", account3.address);

    const contractFactory = await hardhat.starknet.getContractFactory("Multi_sig");
    const contract = await contractFactory.deploy({
        owners: [account1.address, account2.address, account3.address]
    });
    console.log("Deployed to:", contract.address);
    const { res } = await contract.call("num_of_owners");
    console.log("num_of_owners:", res);

    // ----------------------------------------------------------------

    const erc20AFactory = await starknet.getContractFactory("erc20");
    const erc20A = await erc20AFactory.deploy({
        name: hardhat.starknet.shortStringToBigInt("ERC20A"),
        symbol: hardhat.starknet.shortStringToBigInt("ERC20A"),
        decimals: 18,
        initial_supply: uint256.bnToUint256(10000),
        recipient: account1.address
    });
    console.log("erc20A address", erc20A.address);

    await account1.invoke(erc20A, "approve", {
        spender: contract.address,
        amount: uint256.bnToUint256(1000)
    });

    const balanceBefore = await account1.call(erc20A, "balanceOf", {
        account: contract.address
    });
    console.log("contract balance before transfer", balanceBefore);

    await account1.invoke(erc20A, "transfer", {
        recipient: contract.address,
        amount: uint256.bnToUint256(1000)
    });

    const balanceAfter = await account1.call(erc20A, "balanceOf", {
        account: contract.address
    });
    console.log("contract balance after transfer", balanceAfter);

    //----------------------------------------------------------------
    // Send a transaction to the contract.
    // ----------------------------------------------------------------

    try {
        const tx = await account1.invoke(contract, "submit_tx", {
            contract_address: erc20A.address,
            function_selector: hash.getSelectorFromName("transfer"),
            calldata: [number.toFelt(account3.address), number.toFelt(300)]
        });

        console.log("submit_tx:", tx);
    } catch (error) {
        console.log(error);
    }

    // ----------------------------------------------------------------
    // Confirm transaction
    // ----------------------------------------------------------------

    const balanceM1 = await account1.call(erc20A, "balanceOf", {
        account: contract.address
    });
    console.log("contract balance before 3 confirms", balanceM1);

    try {
        const tx1 = await account1.invoke(contract, "comfirm_tx", {
            tx_index: 0
        });
        console.log("confirm_tx:", tx1);

        const tx2 = await account2.invoke(contract, "comfirm_tx", {
            tx_index: 0
        });
        console.log("confirm_tx:", tx2);

        const tx3 = await account3.invoke(contract, "comfirm_tx", {
            tx_index: 0
        });
        console.log("confirm_tx:", tx3);

        // ----------------------------------------------------------------
        // EXECUTE TRANSACTION
        // ----------------------------------------------------------------

        const txExecute = await account3.invoke(contract, "__execute__", {
            tx_index: 0
        });
        console.log("__execute__:", txExecute);

        // ----------------------------------------------------------------
        const balanceM2 = await account1.call(erc20A, "balanceOf", {
            account: contract.address
        });
        console.log("contract balance after 3 confirms", balanceM2);

        const balanceA3 = await account1.call(erc20A, "balanceOf", {
            account: account3.address
        });
        console.log("account 3 balance after 3 confirms", balanceA3);
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
