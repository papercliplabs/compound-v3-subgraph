import { Address, BigDecimal, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import { Token, BaseToken, Market, CollateralToken } from "../../generated/schema";
import { Erc20 as Erc20Contract } from "../../generated/templates/Comet/Erc20";
import { Comet as CometContract } from "../../generated/templates/Comet/Comet";
import { ChainlinkPriceFeed as ChainlinkPriceFeedContract } from "../../generated/templates/Comet/ChainlinkPriceFeed";
import { formatUnits } from "../common/utils";
import { PRICE_FEED_FACTOR, ZERO_ADDRESS, ZERO_BD, ZERO_BI } from "../common/constants";
import {
  getChainlinkCompUsdPriceFeedAddress,
  getCompTokenAddress,
  getMarketUnitOfAccountToUsdPriceFeed,
} from "../common/networkSpecific";

////
// Token
////

export function getOrCreateToken(address: Address, event: ethereum.Event): Token {
  let token = Token.load(address);

  if (!token) {
    token = new Token(address);

    const erc20 = Erc20Contract.bind(address);

    const tryName = erc20.try_name();
    const trySymbol = erc20.try_symbol();

    token.address = address;
    token.name = tryName.reverted ? "UNKNOWN" : tryName.value;
    token.symbol = trySymbol.reverted ? "UNKNOWN" : trySymbol.value;
    token.decimals = erc20.decimals();

    token.lastPriceBlockNumber = ZERO_BI;
    token.lastPriceUsd = ZERO_BD;

    token.save();
  }

  return token;
}

////
// Base Token
////

export function getOrCreateBaseToken(market: Market, token: Token, event: ethereum.Event): BaseToken {
  const id = market.id.concat(token.id);
  let baseToken = BaseToken.load(id);

  if (!baseToken) {
    baseToken = new BaseToken(id);

    baseToken.creationBlockNumber = event.block.number;
    baseToken.market = market.id;
    baseToken.token = token.id;

    baseToken.lastPriceBlockNumber = ZERO_BI;
    baseToken.lastPriceUsd = ZERO_BD;

    updateBaseTokenConfig(baseToken, event);

    baseToken.save();
  }

  return baseToken;
}

export function updateBaseTokenConfig(baseToken: BaseToken, event: ethereum.Event): void {
  const comet = CometContract.bind(Address.fromBytes(baseToken.market));

  baseToken.lastConfigUpdateBlockNumber = event.block.number;
  baseToken.priceFeed = comet.baseTokenPriceFeed();
}

////
// Collateral Asset
////

export function getOrCreateCollateralToken(market: Market, token: Token, event: ethereum.Event): CollateralToken {
  const id = market.id.concat(token.id).concat(Bytes.fromUTF8("COL"));
  let collateralToken = CollateralToken.load(id);

  if (!collateralToken) {
    collateralToken = new CollateralToken(id);

    collateralToken.creationBlockNumber = event.block.number;
    collateralToken.market = market.id;
    collateralToken.token = token.id;

    collateralToken.lastPriceBlockNumber = ZERO_BI;
    collateralToken.lastPriceUsd = ZERO_BD;

    updateCollateralTokenConfig(collateralToken, event);

    collateralToken.save();
  }

  return collateralToken;
}

export function updateCollateralTokenConfig(collateralToken: CollateralToken, event: ethereum.Event): void {
  const comet = CometContract.bind(Address.fromBytes(collateralToken.market));
  const assetInfo = comet.getAssetInfoByAddress(Address.fromBytes(collateralToken.token));

  collateralToken.lastConfigUpdateBlockNumber = event.block.number;
  collateralToken.priceFeed = assetInfo.priceFeed;
  collateralToken.borrowCollateralFactor = formatUnits(assetInfo.borrowCollateralFactor, 18);
  collateralToken.liquidateCollateralFactor = formatUnits(assetInfo.liquidateCollateralFactor, 18);
  collateralToken.liquidationFactor = formatUnits(assetInfo.liquidationFactor, 18);
  collateralToken.supplyCap = assetInfo.supplyCap;
}

export function createCollateralTokenSnapshot(
  collateralToken: CollateralToken,
  event: ethereum.Event
): CollateralToken {
  const snapshotId = collateralToken.id
    .concat(Bytes.fromByteArray(Bytes.fromBigInt(event.block.number)))
    .concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));

  const snapshot = new CollateralToken(snapshotId);

  let entries = collateralToken.entries;
  for (let i = 0; i < entries.length; ++i) {
    if (entries[i].key.toString() != "id") {
      snapshot.set(entries[i].key, entries[i].value);
    }
  }

  snapshot.save();

  return snapshot;
}

////
// Price
////

function getPriceFeedAddressForToken(token: Token): Address {
  // Other feeds can be added here also
  if (token.address.equals(getCompTokenAddress())) {
    return getChainlinkCompUsdPriceFeedAddress();
  } else {
    log.warning("getPriceFeedAddressForToken - no price feed for {}", [token.address.toString()]);
    return ZERO_ADDRESS;
  }
}

function getTokenPriceWithGenericOracleUsd(token: Token, event: ethereum.Event): BigDecimal {
  if (token.lastPriceBlockNumber != event.block.number) {
    const priceFeedAddress = getPriceFeedAddressForToken(token);

    if (ZERO_ADDRESS != priceFeedAddress) {
      const priceFeed = ChainlinkPriceFeedContract.bind(priceFeedAddress);
      const tryLatestRoundData = priceFeed.try_latestRoundData();
      if (!tryLatestRoundData.reverted) {
        const price = tryLatestRoundData.value.value1.toBigDecimal().div(PRICE_FEED_FACTOR);
        token.lastPriceBlockNumber = event.block.number;
        token.lastPriceUsd = price;
        token.save();
      } else {
        log.warning("getTokenPriceWithGenericOracleUsd - try_latestRoundData reverted for {} - {}", [
          priceFeedAddress.toString(),
          token.address.toString(),
        ]);
      }
    }
  }

  return token.lastPriceUsd;
}

function getBaseTokenPriceUsd(token: BaseToken, event: ethereum.Event): BigDecimal {
  if (token.lastPriceBlockNumber != event.block.number) {
    const comet = CometContract.bind(Address.fromBytes(token.market));

    const tryPrice = comet.try_getPrice(Address.fromBytes(token.priceFeed));

    if (!tryPrice.reverted) {
      let price = tryPrice.value.toBigDecimal().div(PRICE_FEED_FACTOR); // In unit of account

      const unitOfAccountToUsdPriceFeed = getMarketUnitOfAccountToUsdPriceFeed(Address.fromBytes(token.market));
      log.debug("getBaseTokenPriceUsd - unitOfAccountToUsdPriceFeed: {} - {}", [
        Address.fromBytes(token.market).toHexString(),
        unitOfAccountToUsdPriceFeed.toHexString(),
      ]);
      if (unitOfAccountToUsdPriceFeed.notEqual(ZERO_ADDRESS)) {
        const unitOfAccountPriceUsd = comet.getPrice(unitOfAccountToUsdPriceFeed).toBigDecimal().div(PRICE_FEED_FACTOR);
        price = price.times(unitOfAccountPriceUsd);
      }

      token.lastPriceBlockNumber = event.block.number;
      token.lastPriceUsd = price;
      token.save();
    }
  }

  return token.lastPriceUsd;
}

function getCollateralTokenPriceUsd(token: CollateralToken, event: ethereum.Event): BigDecimal {
  let price = token.lastPriceUsd;

  if (token.lastPriceBlockNumber != event.block.number) {
    const comet = CometContract.bind(Address.fromBytes(token.market));

    const tryPrice = comet.try_getPrice(Address.fromBytes(token.priceFeed));

    if (!tryPrice.reverted) {
      let price = tryPrice.value.toBigDecimal().div(PRICE_FEED_FACTOR);

      const unitOfAccountToUsdPriceFeed = getMarketUnitOfAccountToUsdPriceFeed(Address.fromBytes(token.market));
      if (unitOfAccountToUsdPriceFeed.notEqual(ZERO_ADDRESS)) {
        const unitOfAccountPriceUsd = comet.getPrice(unitOfAccountToUsdPriceFeed).toBigDecimal().div(PRICE_FEED_FACTOR);
        price = price.times(unitOfAccountPriceUsd);
      }

      token.lastPriceBlockNumber = event.block.number;
      token.lastPriceUsd = price;
      token.save();
    }
  }

  return price;
}

export function getTokenPriceUsd<T>(token: T, event: ethereum.Event): BigDecimal {
  if (token instanceof Token) {
    return getTokenPriceWithGenericOracleUsd(token, event);
  } else if (token instanceof BaseToken) {
    return getBaseTokenPriceUsd(token, event);
  } else if (token instanceof CollateralToken) {
    return getCollateralTokenPriceUsd(token, event);
  } else {
    log.warning("Invalid token type in getTokenPriceUsd: {}", [typeof token]);
    return ZERO_BD;
  }
}
