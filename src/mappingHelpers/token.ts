import { Address, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { Token, BaseToken, Market, CollateralToken } from "../../generated/schema";
import { Erc20 as Erc20Contract } from "../../generated/templates/Comet/Erc20";
import { Comet as CometContract } from "../../generated/templates/Comet/Comet";
import { formatUnits } from "../common/utils";

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
