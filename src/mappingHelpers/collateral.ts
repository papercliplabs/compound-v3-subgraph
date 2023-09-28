import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
    CollateralAsset,
    Market,
    MarketCollateralBalance,
    Position,
    PositionCollateralBalance,
} from "../../generated/schema";
import { ZERO_BI } from "../common/constants";
import { Erc20 as Erc20Contract } from "../../generated/templates/Comet/Erc20";
import { Comet as CometContract } from "../../generated/templates/Comet/Comet";
import { formatUnits } from "../common/utils";

export function getOrCreateCollateralAsset(
    market: Market,
    collateralAddress: Address,
    event: ethereum.Event
): CollateralAsset {
    const collateralAssetId = market.id.concat(collateralAddress);
    let collateralAsset = CollateralAsset.load(collateralAssetId);

    if (!collateralAsset) {
        collateralAsset = new CollateralAsset(collateralAssetId);

        const collateralAssetContract = Erc20Contract.bind(collateralAddress);

        collateralAsset.creationBlockNumber = event.block.number;
        collateralAsset.address = collateralAddress;
        collateralAsset.name = collateralAssetContract.name();
        collateralAsset.symbol = collateralAssetContract.symbol();
        collateralAsset.decimals = collateralAssetContract.decimals();
        collateralAsset.market = market.id;

        updateCollateralAssetConfig(collateralAsset);

        collateralAsset.save();
    }

    return collateralAsset;
}

export function updateCollateralAssetConfig(asset: CollateralAsset): void {
    const comet = CometContract.bind(Address.fromBytes(asset.market));
    const assetInfo = comet.getAssetInfoByAddress(Address.fromBytes(asset.address));

    asset.priceFeed = assetInfo.priceFeed;
    asset.borrowCollateralFactor = formatUnits(assetInfo.borrowCollateralFactor, 18);
    asset.liquidateCollateralFactor = formatUnits(assetInfo.liquidateCollateralFactor, 18);
    asset.liquidationFactor = formatUnits(assetInfo.liquidationFactor, 18);
    asset.supplyCap = assetInfo.supplyCap;
}

export function getOrCreateMarketCollateralBalance(
    collateral: CollateralAsset,
    event: ethereum.Event
): MarketCollateralBalance {
    const id = collateral.market.concat(collateral.address).concat(Bytes.fromUTF8("bal"));

    let collateralBalance = MarketCollateralBalance.load(id);

    if (!collateralBalance) {
        collateralBalance = new MarketCollateralBalance(id);

        collateralBalance.creationBlockNumber = event.block.number;
        collateralBalance.lastUpdatedBlockNumber = event.block.number;
        collateralBalance.market = collateral.market;
        collateralBalance.collateralAsset = collateral.id;
        collateralBalance.balance = ZERO_BI;

        collateralBalance.save();
    }

    return collateralBalance;
}

export function getOrCreatePositionCollateralBalance(
    collateral: CollateralAsset,
    position: Position,
    event: ethereum.Event
): PositionCollateralBalance {
    const id = position.id.concat(collateral.address);

    let collateralBalance = PositionCollateralBalance.load(id);

    if (!collateralBalance) {
        collateralBalance = new PositionCollateralBalance(id);

        collateralBalance.creationBlockNumber = event.block.number;
        collateralBalance.lastUpdatedBlockNumber = event.block.number;
        collateralBalance.position = position.id;
        collateralBalance.collateralAsset = collateral.id;
        collateralBalance.balance = ZERO_BI;

        collateralBalance.save();
    }

    return collateralBalance;
}

export function updateMarketCollateralBalance(
    marketCollateralBalance: MarketCollateralBalance,
    deltaBalance: BigInt,
    event: ethereum.Event
): void {
    marketCollateralBalance.lastUpdatedBlockNumber = event.block.number;
    marketCollateralBalance.balance = marketCollateralBalance.balance.plus(deltaBalance);
}

export function updatePositionCollateralBalance(
    positionCollateralBalance: PositionCollateralBalance,
    deltaBalance: BigInt,
    event: ethereum.Event
): void {
    positionCollateralBalance.lastUpdatedBlockNumber = event.block.number;
    positionCollateralBalance.balance = positionCollateralBalance.balance.plus(deltaBalance);
}
