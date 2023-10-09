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

// multiReadContract(COMET_ADDRESS, cometAbi as Abi, getNoInputViewFunctions(cometAbi as Abi), null, READ_BLOCK);

async function test() {
    const res = await client.readContract({
        address: COMET_ADDRESS,
        abi: cometAbi,
        // functionName: "getAssetInfoByAddress",
        // functionName: "totalsCollateral",
        functionName: "getCollateralReserves",
        // args: ["0xbe9895146f7af43049ca1c1ae358b0541ea49704"],
        args: ["0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2"],
        blockNumber: BigInt(18315072),
    });

    console.log(res);
}
test();
