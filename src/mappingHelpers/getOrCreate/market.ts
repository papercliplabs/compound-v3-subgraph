import { Address, ethereum } from "@graphprotocol/graph-ts";
import { BaseAsset, CollateralAsset, Market } from "../../../generated/schema";
import { Comet as CometContract } from "../../../generated/templates/Comet/Comet";
import { Configurator as ConfiguratorContract } from "../../../generated/templates/Comet/Configurator";
import { Erc20 as Erc20Contract } from "../../../generated/templates/Comet/Erc20";
import { CONFIGURATOR_PROXY_ADDRESS } from "../../common/constants";

export function getOrCreateMarket(marketId: Address, event: ethereum.Event): Market {
    let market = Market.load(marketId);

    if (!market) {
        market = new Market(marketId);
        const configurator = ConfiguratorContract.bind(Address.fromBytes(market.protocol));

        market.cometProxy = marketId;
        market.protocol = CONFIGURATOR_PROXY_ADDRESS;
        market.creationBlockNumber = event.block.number;
        market.factory = configurator.factory(Address.fromBytes(market.id));

        updateMarketConfiguration(market);

        // TODO: initialize all accounting to 0 here

        market.save();
    }

    return market;
}

export function updateMarketConfiguration(market: Market): void {
    const comet = CometContract.bind(Address.fromBytes(market.id));
    const configurator = ConfiguratorContract.bind(Address.fromBytes(market.protocol));

    market.governor = comet.governor();
    market.pauseGuardian = comet.pauseGuardian();
    market.extensionDelegate = comet.extensionDelegate();

    market.supplyKink = comet.supplyKink();
    market.supplyPerYearInterestRateSlopeLow = comet.supplyPerSecondInterestRateSlopeLow(); // TODO: note sec vs year
    market.supplyPerYearInterestRateSlopeHigh = comet.supplyPerSecondInterestRateSlopeHigh(); // TODO: note sec vs year
    market.supplyPerYearInterestRateBase = comet.supplyPerSecondInterestRateBase(); // TODO: note sec vs year

    market.borrowKink = comet.borrowKink();
    market.borrowPerYearInterestRateSlopeLow = comet.borrowPerSecondInterestRateSlopeLow(); // TODO: note sec vs year
    market.borrowPerYearInterestRateSlopeHigh = comet.borrowPerSecondInterestRateSlopeHigh(); // TODO: note sec vs year
    market.borrowPerYearInterestRateBase = comet.borrowPerSecondInterestRateBase(); // TODO: note sec vs year

    market.storeFrontPriceFactor = comet.storeFrontPriceFactor();
    market.trackingIndexScale = comet.trackingIndexScale();

    market.baseTrackingSupplySpeed = comet.baseTrackingSupplySpeed();
    market.baseTrackingBorrowSpeed = comet.baseTrackingBorrowSpeed();
    market.baseMinForRewards = comet.baseMinForRewards();
    market.targetReserves = comet.targetReserves();

    // Base asset
    const baseAssetAddress = comet.baseToken();
    const baseAssetId = market.id.concat(baseAssetAddress);

    let baseAsset = BaseAsset.load(baseAssetId);
    if (!baseAsset) {
        baseAsset = new BaseAsset(baseAssetId);
        baseAsset.address = baseAssetAddress;
        baseAsset.market = market.id;

        const baseAssetContract = Erc20Contract.bind(baseAssetAddress);

        baseAsset.name = baseAssetContract.name();
        baseAsset.symbol = baseAssetContract.symbol();
        baseAsset.decimals = baseAssetContract.decimals();
    }
    baseAsset.priceFeed = comet.baseTokenPriceFeed();
    baseAsset.save();

    market.baseAsset = baseAsset.id;

    // Collateral assets

    // Not ideal as it is possible config changed and is not deployed and updated yet, but unlikely as proposals redeploy + update
    const config = configurator.getConfiguration(Address.fromBytes(market.id));
    for (let i = 0; i < config.assetConfigs.length; i++) {
        const assetConfig = config.assetConfigs[i];

        const collateralAssetId = market.id.concat(assetConfig.asset);
        let collateralAsset = CollateralAsset.load(collateralAssetId);

        if (!collateralAsset) {
            collateralAsset = new CollateralAsset(collateralAssetId);

            const collateralAssetContract = Erc20Contract.bind(assetConfig.asset);

            collateralAsset.address = assetConfig.asset;
            collateralAsset.name = collateralAssetContract.name();
            collateralAsset.symbol = collateralAssetContract.symbol();
            collateralAsset.decimals = collateralAssetContract.decimals();
            collateralAsset.market = market.id;
        }
        collateralAsset.priceFeed = assetConfig.priceFeed;
        collateralAsset.borrowCollateralFactor = assetConfig.borrowCollateralFactor;
        collateralAsset.liquidateCollateralFactor = assetConfig.liquidateCollateralFactor;
        collateralAsset.liquidationFactor = assetConfig.liquidationFactor;
        collateralAsset.supplyCap = assetConfig.supplyCap;

        collateralAsset.save();
    }

    market.save();
}
