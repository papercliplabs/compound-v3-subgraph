import { Address, BigDecimal, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import { Token, BaseToken, Market, CollateralToken } from "../../generated/schema";
import { Erc20 as Erc20Contract } from "../../generated/templates/Comet/Erc20";
import { Comet as CometContract } from "../../generated/templates/Comet/Comet";
import { formatUnits } from "../common/utils";
import {
    CHAINLINK_ETH_USDC_PRICE_FEED,
    CHAINLINK_ORACLE_ADDRESS,
    CHAINLINK_USD_ADDRESS,
    PRICE_FEED_FACTOR,
    WETH_MARKET_ADDRESS,
    ZERO_BD,
    ZERO_BI,
} from "../common/constants";
import { ChainlinkOracle as ChainlinkOracleContract } from "../../generated/templates/Comet/ChainlinkOracle";

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

////
// Price
////

function getTokenPriceWithGenericOracleUsd(token: Token, event: ethereum.Event): BigDecimal {
    if (token.lastPriceBlockNumber != event.block.number) {
        const chainlink = ChainlinkOracleContract.bind(CHAINLINK_ORACLE_ADDRESS);

        const tryLatestRoundData = chainlink.try_latestRoundData(Address.fromBytes(token.id), CHAINLINK_USD_ADDRESS);

        if (!tryLatestRoundData.reverted) {
            const price = tryLatestRoundData.value.value1.toBigDecimal().div(PRICE_FEED_FACTOR);

            token.lastPriceBlockNumber = event.block.number;
            token.lastPriceUsd = price;
            token.save();
        }
    }

    return token.lastPriceUsd;
}

function getBaseTokenPriceUsd(token: BaseToken, event: ethereum.Event): BigDecimal {
    const isWethMarket = Address.fromBytes(token.market).equals(WETH_MARKET_ADDRESS);

    if (token.lastPriceBlockNumber != event.block.number) {
        const comet = CometContract.bind(Address.fromBytes(token.market));

        const tryPrice = comet.try_getPrice(Address.fromBytes(token.priceFeed));

        if (!tryPrice.reverted) {
            let price = tryPrice.value.toBigDecimal().div(PRICE_FEED_FACTOR);

            if (isWethMarket) {
                // In WETH markets, price is returned in ETH, so need to convert to USD after
                const ethPrice = comet
                    .getPrice(CHAINLINK_ETH_USDC_PRICE_FEED)
                    .toBigDecimal()
                    .div(PRICE_FEED_FACTOR);

                price = price.times(ethPrice);
            }

            token.lastPriceBlockNumber = event.block.number;
            token.lastPriceUsd = price;
            token.save();
        }
    }

    return token.lastPriceUsd;
}

function getCollateralTokenPriceUsd(token: CollateralToken, event: ethereum.Event): BigDecimal {
    const isWethMarket = Address.fromBytes(token.market).equals(WETH_MARKET_ADDRESS);
    let price = token.lastPriceUsd;

    if (token.lastPriceBlockNumber != event.block.number) {
        const comet = CometContract.bind(Address.fromBytes(token.market));

        const tryPrice = comet.try_getPrice(Address.fromBytes(token.priceFeed));

        if (!tryPrice.reverted) {
            let price = tryPrice.value.toBigDecimal().div(PRICE_FEED_FACTOR);

            if (isWethMarket) {
                // In WETH markets, price is returned in ETH, so need to convert to USD after
                const ethPrice = comet
                    .getPrice(CHAINLINK_ETH_USDC_PRICE_FEED)
                    .toBigDecimal()
                    .div(PRICE_FEED_FACTOR);

                price = price.times(ethPrice);
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
