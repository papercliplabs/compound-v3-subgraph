import { Address, dataSource, log } from "@graphprotocol/graph-ts";
import { ZERO_ADDRESS } from "./constants";

namespace SupportedChain {
  export const MAINNET = "mainnet";
  export const POLYGON = "matic";
  export const BASE = "base";
  export const ARBITRUM = "arbitrum-one";
  export const OPTIMISM = "optimism";
  export const SCROLL = "scroll";

  // Testnet
  export const SEPOLIA = "sepolia";
  export const BASE_SEPOLIA = "base-sepolia";
}

const configuratorProxyAddress = new Map<string, Address>()
  .set(SupportedChain.MAINNET, Address.fromString("0x316f9708bB98af7dA9c68C1C3b5e79039cD336E3"))
  .set(SupportedChain.POLYGON, Address.fromString("0x83E0F742cAcBE66349E3701B171eE2487a26e738"))
  .set(SupportedChain.BASE, Address.fromString("0x45939657d1CA34A8FA39A924B71D28Fe8431e581"))
  .set(SupportedChain.ARBITRUM, Address.fromString("0xb21b06D71c75973babdE35b49fFDAc3F82Ad3775"))
  .set(SupportedChain.OPTIMISM, Address.fromString("0x84E93EC6170ED630f5ebD89A1AAE72d4F63f2713"))
  .set(SupportedChain.SCROLL, Address.fromString("0xECAB0bEEa3e5DEa0c35d3E69468EAC20098032D7"))
  .set(SupportedChain.SEPOLIA, Address.fromString("0xc28aD44975C614EaBe0Ed090207314549e1c6624"))
  .set(SupportedChain.BASE_SEPOLIA, Address.fromString("0x090a2b1fc84d0b5141d5D5608b12Db19201aE5a6"))
  .set("fallback", ZERO_ADDRESS);

const cometRewardsAddress = new Map<string, Address>()
  .set(SupportedChain.MAINNET, Address.fromString("0x1B0e765F6224C21223AeA2af16c1C46E38885a40"))
  .set(SupportedChain.POLYGON, Address.fromString("0x45939657d1CA34A8FA39A924B71D28Fe8431e581"))
  .set(SupportedChain.BASE, Address.fromString("0x123964802e6ABabBE1Bc9547D72Ef1B69B00A6b1"))
  .set(SupportedChain.ARBITRUM, Address.fromString("0x88730d254A2f7e6AC8388c3198aFd694bA9f7fae"))
  .set(SupportedChain.OPTIMISM, Address.fromString("0x443EA0340cb75a160F31A440722dec7b5bc3C2E9"))
  .set(SupportedChain.SCROLL, Address.fromString("0x70167D30964cbFDc315ECAe02441Af747bE0c5Ee"))
  .set(SupportedChain.SEPOLIA, Address.fromString("0x8bF5b658bdF0388E8b482ED51B14aef58f90abfD"))
  .set(SupportedChain.BASE_SEPOLIA, Address.fromString("0x3394fa1baCC0b47dd0fF28C8573a476a161aF7BC"))
  .set("fallback", ZERO_ADDRESS);

const compTokenAddress = new Map<string, Address>()
  .set(SupportedChain.MAINNET, Address.fromString("0xc00e94Cb662C3520282E6f5717214004A7f26888"))
  .set(SupportedChain.POLYGON, Address.fromString("0x8505b9d2254A7Ae468c0E9dd10Ccea3A837aef5c"))
  .set(SupportedChain.BASE, Address.fromString("0x9e1028f5f1d5ede59748ffcee5532509976840e0"))
  .set(SupportedChain.ARBITRUM, Address.fromString("0x354A6dA3fcde098F8389cad84b0182725c6C91dE"))
  .set(SupportedChain.OPTIMISM, Address.fromString("0x7e7d4467112689329f7E06571eD0E8CbAd4910eE"))
  .set(SupportedChain.SCROLL, Address.fromString("0x643e160a3C3E2B7eae198f0beB1BfD2441450e86"))
  .set(SupportedChain.SEPOLIA, Address.fromString("0xA6c8D1c55951e8AC44a0EaA959Be5Fd21cc07531"))
  .set(SupportedChain.BASE_SEPOLIA, Address.fromString("0x2f535da74048c0874400f0371Fba20DF983A56e2"))
  .set("fallback", ZERO_ADDRESS);

const chainlinkEthUsdPriceFeedAddress = new Map<string, Address>()
  .set(SupportedChain.MAINNET, Address.fromString("0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419"))
  .set(SupportedChain.POLYGON, Address.fromString("0xF9680D99D6C9589e2a93a78A04A279e509205945"))
  .set(SupportedChain.BASE, Address.fromString("0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70"))
  .set(SupportedChain.ARBITRUM, Address.fromString("0x639Fe6ab55C921f74e7fac1ee960C0B6293ba612"))
  .set(SupportedChain.OPTIMISM, Address.fromString("0x13e3Ee699D1909E989722E753853AE30b17e08c5"))
  .set(SupportedChain.SCROLL, Address.fromString("0x6bF14CB0A831078629D993FDeBcB182b21A8774C"))
  .set(SupportedChain.SEPOLIA, Address.fromString("0x694AA1769357215DE4FAC081bf1f309aDC325306"))
  .set(SupportedChain.BASE_SEPOLIA, Address.fromString("0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1"))
  .set("fallback", ZERO_ADDRESS);

const chainlinkCompUsdPriceFeedAddress = new Map<string, Address>()
  .set(SupportedChain.MAINNET, Address.fromString("0xdbd020CAeF83eFd542f4De03e3cF0C28A4428bd5"))
  .set(SupportedChain.POLYGON, Address.fromString("0x2A8758b7257102461BC958279054e372C2b1bDE6"))
  .set(SupportedChain.BASE, Address.fromString("0x9DDa783DE64A9d1A60c49ca761EbE528C35BA428"))
  .set(SupportedChain.ARBITRUM, Address.fromString("0xe7C53FFd03Eb6ceF7d208bC4C13446c76d1E5884"))
  .set(SupportedChain.OPTIMISM, Address.fromString("0xe1011160d78a80E2eEBD60C228EEf7af4Dfcd4d7"))
  .set(SupportedChain.SCROLL, Address.fromString("0x6726C678feE07B25BBE67bC720728652E4129369"))
  .set(SupportedChain.SEPOLIA, ZERO_ADDRESS) // Price feed doesn't exist
  .set(SupportedChain.BASE_SEPOLIA, ZERO_ADDRESS) // Price feed doesn't exist
  .set("fallback", ZERO_ADDRESS);

// Price feed for the markets unit of account to USD. The markets price feeds return prices in this unit of account.
// If not specified, USD is assumed to already be the unit of account
// prettier-ignore
const marketUnitOfAccountToUsdPriceFeedAddresses = new Map<string, Map<string, Address>>()
  .set(
    SupportedChain.MAINNET,
    new Map<string, Address>()
      .set("0xA17581A9E3356d9A858b789D68B4d866e593aE94".toLowerCase(), chainlinkEthUsdPriceFeedAddress.get(SupportedChain.MAINNET)) // WETH market: ETH / USD
      .set("0x3D0bb1ccaB520A66e607822fC55BC921738fAFE3".toLowerCase(), Address.fromString("0x164b276057258d81941e97B0a900D4C7B358bCe0")) 
  )
  .set(SupportedChain.POLYGON, new Map<string, Address>())
  .set(
    SupportedChain.BASE,
    new Map<string, Address>()
      .set("0x46e6b214b524310239732D51387075E0e70970bf".toLowerCase(), chainlinkEthUsdPriceFeedAddress.get(SupportedChain.BASE)) // WETH market: ETH / USD
  )
  .set(
    SupportedChain.ARBITRUM,
    new Map<string, Address>()
      .set("0x6f7D514bbD4aFf3BcD1140B7344b32f063dEe486".toLowerCase(), chainlinkEthUsdPriceFeedAddress.get(SupportedChain.ARBITRUM)) // WETH market: ETH / USD
  ) 
  .set(
    SupportedChain.OPTIMISM,
    new Map<string, Address>()
      .set("0xE36A30D249f7761327fd973001A32010b521b6Fd".toLowerCase(), chainlinkEthUsdPriceFeedAddress.get(SupportedChain.OPTIMISM)) // WETH market: ETH / USD
  )
  .set(SupportedChain.SCROLL, new Map<string, Address>())
  .set(
    SupportedChain.SEPOLIA,
    new Map<string, Address>()
      .set("0x2943ac1216979aD8dB76D9147F64E61adc126e96".toLowerCase(), chainlinkEthUsdPriceFeedAddress.get(SupportedChain.SEPOLIA)) // WETH market: ETH / USD
  )
  .set(
    SupportedChain.BASE_SEPOLIA,
    new Map<string, Address>()
      .set("0x61490650AbaA31393464C3f34E8B29cd1C44118E".toLowerCase(), chainlinkEthUsdPriceFeedAddress.get(SupportedChain.BASE_SEPOLIA)) // WETH market: ETH / USD
  )
  .set("fallback", new Map<string, Address>());

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

export function getCompTokenAddress(): Address {
  return getChainSpecificData(compTokenAddress);
}

export function getChainlinkEthUsdPriceFeedAddress(): Address {
  return getChainSpecificData(chainlinkEthUsdPriceFeedAddress);
}

export function getChainlinkCompUsdPriceFeedAddress(): Address {
  return getChainSpecificData(chainlinkCompUsdPriceFeedAddress);
}

// Returns zero address if the unit of account is already USD
export function getMarketUnitOfAccountToUsdPriceFeed(marketAddress: Address): Address {
  const chainData = getChainSpecificData(marketUnitOfAccountToUsdPriceFeedAddresses);
  const normalizedAddress = marketAddress.toHexString().toLowerCase();
  if (chainData.has(normalizedAddress)) {
    return chainData.get(normalizedAddress);
  } else {
    return ZERO_ADDRESS;
  }
}
