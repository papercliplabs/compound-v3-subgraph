import "isomorphic-fetch";

import { Abi, Address, createPublicClient, http, parseAbi } from "viem";
import { mainnet } from "viem/chains";
import cometAbi from "../abis/comet.json";
import erc20Abi from "../abis/Erc20.json";

// Make BigInt serializable...
(BigInt.prototype as any).toJSON = function() {
    return this.toString();
};

const READ_BLOCK = BigInt(18314678);
const PRICE_FEED_DECIMALS = 8;

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

    const supplyBalRes = await client.readContract({
        address: cometAddress,
        abi: cometAbi,
        functionName: "balanceOf",
        args: [accountAddress],
        blockNumber: blockNumber,
    });

    const borrowBalRes = await client.readContract({
        address: cometAddress,
        abi: cometAbi,
        functionName: "borrowBalanceOf",
        args: [accountAddress],
        blockNumber: blockNumber,
    });

    const basePriceFeed = await client.readContract({
        address: cometAddress,
        abi: cometAbi,
        functionName: "baseTokenPriceFeed",
        args: [],
        blockNumber: blockNumber,
    });

    const basePrice = (await client.readContract({
        address: cometAddress,
        abi: cometAbi,
        functionName: "getPrice",
        args: [basePriceFeed],
        blockNumber: blockNumber,
    })) as bigint;

    const baseAddress = (await client.readContract({
        address: cometAddress,
        abi: cometAbi,
        functionName: "baseToken",
        args: [],
        blockNumber: blockNumber,
    })) as Address;

    const baseDecimals = (await client.readContract({
        address: baseAddress,
        abi: erc20Abi,
        functionName: "decimals",
        args: [],
        blockNumber: blockNumber,
    })) as number;

    const baseBal = supplyBalRes != BigInt(0) ? (supplyBalRes as bigint) : (borrowBalRes as bigint) * BigInt(-1);

    console.log("Principal: ", (basicRes as Array<any>)[0]);
    console.log("Base balance: ", baseBal);
    console.log("baseTrackingIndex: ", (basicRes as Array<any>)[1]);
    console.log("baseTrackingAccured: ", (basicRes as Array<any>)[2]);
    console.log(
        "Base balance USD or ETH: ",
        (baseBal * basePrice) / BigInt(10 ** (baseDecimals + PRICE_FEED_DECIMALS))
    );

    const numAssets = (await client.readContract({
        address: cometAddress,
        abi: cometAbi,
        functionName: "numAssets",
        blockNumber: blockNumber,
    })) as number;

    let totalColBalUsd = BigInt(0);

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

        const colPrice = await client.readContract({
            address: cometAddress,
            abi: cometAbi,
            functionName: "getPrice",
            args: [(assetInfo as any)["priceFeed"]],
            blockNumber: blockNumber,
        });

        const decimals = (await client.readContract({
            address: colAddress,
            abi: erc20Abi,
            functionName: "decimals",
            args: [],
            blockNumber: blockNumber,
        })) as number;

        const colSymbol = (await client.readContract({
            address: colAddress,
            abi: erc20Abi,
            functionName: "symbol",
            args: [],
            blockNumber: blockNumber,
        })) as string;

        const colBal = (colRes as Array<any>)[0];
        const colBalUsd = ((colBal as bigint) * (colPrice as bigint)) / BigInt(10 ** (decimals + PRICE_FEED_DECIMALS));

        console.log("COLLATERAL BALANCE: ", colAddress, colSymbol);
        console.log("Balance - ", colBal);
        console.log("Balance USD or ETH - ", colBalUsd);

        totalColBalUsd += colBalUsd;
    }

    console.log("TOTAL Collateral Balance USD or ETH: ", totalColBalUsd);
}

async function main() {
    // await multiReadContract(COMET_ADDRESS, cometAbi as Abi, getNoInputViewFunctions(cometAbi as Abi), null, READ_BLOCK);
    // console.log("\n\n\n");
    // await marketCollateralInfo(COMET_ADDRESS, "0x2260fac5e5542a773aa44fbcfedf7c193bc2c599", BigInt(18315072));
    // console.log("\n\n\n");
    await getPositionInfo(
        "0xa17581a9e3356d9a858b789d68b4d866e593ae94",
        "0x10d88638be3c26f3a47d861b8b5641508501035d",
        BigInt(17607287)
    );
}

main();
