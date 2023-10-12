import { Address, dataSource, log } from "@graphprotocol/graph-ts";
import { ZERO_ADDRESS } from "./constants";

namespace SupportedChain {
    export const MAINNET = "mainnet";
    export const POLYGON = "matic";
    export const BASE = "base";
    export const ARBITRUM = "arbitrum-one";
}

const configuratorProxyAddress = new Map<string, Address>()
    .set(SupportedChain.MAINNET, Address.fromString("0x316f9708bB98af7dA9c68C1C3b5e79039cD336E3"))
    .set(SupportedChain.POLYGON, Address.fromString("0x83E0F742cAcBE66349E3701B171eE2487a26e738"))
    .set(SupportedChain.BASE, Address.fromString("0x45939657d1CA34A8FA39A924B71D28Fe8431e581"))
    .set(SupportedChain.ARBITRUM, Address.fromString("0xb21b06D71c75973babdE35b49fFDAc3F82Ad3775"))
    .set("fallback", ZERO_ADDRESS);

const cometRewardsAddress = new Map<string, Address>()
    .set(SupportedChain.MAINNET, Address.fromString("0x1B0e765F6224C21223AeA2af16c1C46E38885a40"))
    .set(SupportedChain.POLYGON, Address.fromString("0x45939657d1CA34A8FA39A924B71D28Fe8431e581"))
    .set(SupportedChain.BASE, Address.fromString("0x123964802e6ABabBE1Bc9547D72Ef1B69B00A6b1"))
    .set(SupportedChain.ARBITRUM, Address.fromString("0x88730d254A2f7e6AC8388c3198aFd694bA9f7fae"))
    .set("fallback", ZERO_ADDRESS);

// Only needed because ETH markets are priced in ETH, not USDC
const wethMarketProxyAddress = new Map<string, Address>()
    .set(SupportedChain.MAINNET, Address.fromString("0xA17581A9E3356d9A858b789D68B4d866e593aE94"))
    .set(SupportedChain.POLYGON, ZERO_ADDRESS) // None exists
    .set(SupportedChain.BASE, Address.fromString("0x46e6b214b524310239732D51387075E0e70970bf"))
    .set(SupportedChain.ARBITRUM, ZERO_ADDRESS) // None exists
    .set("fallback", ZERO_ADDRESS);

const compTokenAddress = new Map<string, Address>()
    .set(SupportedChain.MAINNET, Address.fromString("0xc00e94Cb662C3520282E6f5717214004A7f26888"))
    .set(SupportedChain.POLYGON, Address.fromString("0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c"))
    .set(SupportedChain.BASE, Address.fromString("0xc00e94Cb662C3520282E6f5717214004A7f26888"))
    .set(SupportedChain.ARBITRUM, Address.fromString("0x354A6dA3fcde098F8389cad84b0182725c6C91dE"))
    .set("fallback", ZERO_ADDRESS);

const chainlinkEthUsdPriceFeedAddress = new Map<string, Address>()
    .set(SupportedChain.MAINNET, Address.fromString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"))
    .set(SupportedChain.POLYGON, Address.fromString("0xF9680D99D6C9589e2a93a78A04A279e509205945"))
    .set(SupportedChain.BASE, Address.fromString("0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70"))
    .set(SupportedChain.ARBITRUM, Address.fromString("0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612"))
    .set("fallback", ZERO_ADDRESS);

const chainlinkCompUsdPriceFeedAddress = new Map<string, Address>()
    .set(SupportedChain.MAINNET, Address.fromString("0xdbd020CAeF83eFd542f4De03e3cF0C28A4428bd5"))
    .set(SupportedChain.POLYGON, Address.fromString("0x2A8758b7257102461BC958279054e372C2b1bDE6"))
    .set(SupportedChain.BASE, Address.fromString("0x9DDa783DE64A9d1A60c49ca761EbE528C35BA428"))
    .set(SupportedChain.ARBITRUM, Address.fromString("0xe7C53FFd03Eb6ceF7d208bC4C13446c76d1E5884"))
    .set("fallback", ZERO_ADDRESS);

/**
 * Get chain specific data from a map
 * @param map
 * @return data for the chain, or the fallback if not supported
 */
function getChainSpecificData<T>(map: Map<string, T>): T {
    const network = dataSource.network();

    if (map.has(network)) {
        return map.get(network);
    } else {
        log.error("getChainSpecificData - unsupported network: {}", [network]);
        return map.get("fallback");
    }
}

export function getConfiguratorProxyAddress(): Address {
    return getChainSpecificData(configuratorProxyAddress);
}

export function getCometRewardAddress(): Address {
    return getChainSpecificData(cometRewardsAddress);
}

// Returns zero address if a WETH market doesn't exist
export function getWethMarketAddress(): Address {
    return getChainSpecificData(wethMarketProxyAddress);
}

export function getCompTokenAddress(): Address {
    return getChainSpecificData(compTokenAddress);
}

export function getChainlinkEthUsdPriceFeedAddress(): Address {
    return getChainSpecificData(chainlinkEthUsdPriceFeedAddress);
}

export function getChainlinkCompUsdPriceFeedAddress(): Address {
    return getChainSpecificData(chainlinkCompUsdPriceFeedAddress);
}
