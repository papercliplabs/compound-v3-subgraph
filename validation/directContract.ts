import "isomorphic-fetch";

import { Abi, Address, createPublicClient, http, parseAbi } from "viem";
import { mainnet } from "viem/chains";
import cometAbi from "../abis/comet.json";

// Make BigInt serializable...
(BigInt.prototype as any).toJSON = function() {
    return this.toString();
};

const READ_BLOCK = BigInt(18314678);

const MAINNET_USDC_COMET_PROXY = "0xc3d688b66703497daa19211eedff47f25384cdc3";
const MAINNET_ETHER_COMET_PROXY = "0xa17581a9e3356d9a858b789d68b4d866e593ae94";

const COMET_ADDRESS = MAINNET_USDC_COMET_PROXY;

const client = createPublicClient({
    chain: mainnet,
    transport: http(),
});

function getNoInputViewFunctions(abi: Abi): string[] {
    const noInputViewFunctions = [];
    for (const param of abi) {
        if (param.type == "function" && param.stateMutability == "view" && param.inputs.length == 0) {
            noInputViewFunctions.push(param.name);
        }
    }

    return noInputViewFunctions;
}

async function multiReadContract(
    contractAddress: Address,
    abi: Abi,
    functions: string[],
    args: any[] | null,
    blockNumber: bigint
): Promise<void> {
    const multicallParams = functions.map((f, i) => {
        return {
            address: contractAddress,
            abi: abi,
            functionName: f,
            arg: args ? args[i] : [],
        };
    });

    // console.log(multicallParams);

    const results = await client.multicall({
        contracts: multicallParams,
        blockNumber: blockNumber,
    });

    console.log("CONTRACT: ", contractAddress);
    console.log("BLOCK: ", blockNumber);
    results.map((result, i) => {
        console.log(`${functions[i]}: ${JSON.stringify(result.result)}`);
    });
}

async function marketCollateralInfo(cometAddress: Address, collateralAddress: Address, blockNumber: bigint) {
    const functionNames = ["getAssetInfoByAddress", "totalsCollateral", "getCollateralReserves"];
    console.log("COLLATERAL INFO - ", collateralAddress);
    for (let fnName of functionNames) {
        const res = await client.readContract({
            address: cometAddress,
            abi: cometAbi,
            functionName: fnName,
            args: [collateralAddress],
            blockNumber: blockNumber,
        });

        console.log(fnName, res);
    }
}

async function getPositionInfo(cometAddress: Address, accountAddress: Address, blockNumber: bigint) {
    const basicRes = await client.readContract({
        address: cometAddress,
        abi: cometAbi,
        functionName: "userBasic",
        args: [accountAddress],
        blockNumber: blockNumber,
    });

    console.log("Principal: ", (basicRes as Array<any>)[0]);
    console.log("baseTrackingIndex: ", (basicRes as Array<any>)[1]);
    console.log("baseTrackingAccured: ", (basicRes as Array<any>)[2]);

    const numAssets = (await client.readContract({
        address: cometAddress,
        abi: cometAbi,
        functionName: "numAssets",
        blockNumber: blockNumber,
    })) as number;

    for (let i = 0; i < numAssets; i++) {
        const assetInfo = await client.readContract({
            address: cometAddress,
            abi: cometAbi,
            functionName: "getAssetInfo",
            args: [i],
            blockNumber: blockNumber,
        });

        const colAddress = (assetInfo as any)["asset"] as Address;

        const colRes = await client.readContract({
            address: cometAddress,
            abi: cometAbi,
            functionName: "userCollateral",
            args: [accountAddress, colAddress],
            blockNumber: blockNumber,
        });

        console.log("Col bal - ", colAddress, ": ", (colRes as Array<any>)[0]);
    }
}

async function main() {
    // await multiReadContract(COMET_ADDRESS, cometAbi as Abi, getNoInputViewFunctions(cometAbi as Abi), null, READ_BLOCK);
    // console.log("\n\n\n");
    // await marketCollateralInfo(COMET_ADDRESS, "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", BigInt(18315072));
    // console.log("\n\n\n");
    await getPositionInfo(
        "0xa17581a9e3356d9a858b789d68b4d866e593ae94",
        "0x73f3869e754a0a9df4bb33bad248c0182dda5175",
        BigInt(17367807)
    );
}

main();
