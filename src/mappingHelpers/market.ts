import { Address, ethereum, BigInt } from "@graphprotocol/graph-ts";
import { BaseAsset, CollateralAsset, Market } from "../../generated/schema";
import { Comet as CometContract } from "../../generated/templates/Comet/Comet";
import { Configurator as ConfiguratorContract } from "../../generated/templates/Comet/Configurator";
import { Erc20 as Erc20Contract } from "../../generated/templates/Comet/Erc20";
import { CONFIGURATOR_PROXY_ADDRESS, ZERO_BI } from "../common/constants";
import { bigDecimalSafeDiv, computeApr, formatUnits, presentValue } from "../common/utils";

export function getOrCreateMarket(marketId: Address, event: ethereum.Event): Market {
    let market = Market.load(marketId);

    if (!market) {
        market = new Market(marketId);
        const configurator = ConfiguratorContract.bind(CONFIGURATOR_PROXY_ADDRESS);

        market.cometProxy = marketId;
        market.protocol = CONFIGURATOR_PROXY_ADDRESS;
        market.creationBlockNumber = event.block.number;
        market.factory = configurator.factory(Address.fromBytes(market.id));

        updateMarketConfiguration(market, event);

        updateMarketIndices(market, event);

        // Set all accounting inputs
        market.lastAccountingUpdatedBlockNumber = event.block.number;
        market.totalBasePrincipalSupply = ZERO_BI;
        market.totalBasePrincipalBorrow = ZERO_BI;

        updateMarketDerivedAccounting(market, event);

        market.save();
    }

    return market;
}

export function updateMarketConfiguration(market: Market, event: ethereum.Event): void {
    const comet = CometContract.bind(Address.fromBytes(market.id));
    const configurator = ConfiguratorContract.bind(Address.fromBytes(market.protocol));

    market.lastConfigurationUpdateBlockNumber = event.block.number;
    market.governor = comet.governor();
    market.pauseGuardian = comet.pauseGuardian();
    market.extensionDelegate = comet.extensionDelegate();

    market.supplyKink = formatUnits(comet.supplyKink(), 18);
    market.supplyPerSecondInterestRateSlopeLow = comet.supplyPerSecondInterestRateSlopeLow();
    market.supplyPerSecondInterestRateSlopeHigh = comet.supplyPerSecondInterestRateSlopeHigh();
    market.supplyPerSecondInterestRateBase = comet.supplyPerSecondInterestRateBase();

    market.borrowKink = formatUnits(comet.borrowKink(), 18);
    market.borrowPerSecondInterestRateSlopeLow = comet.borrowPerSecondInterestRateSlopeLow();
    market.borrowPerSecondInterestRateSlopeHigh = comet.borrowPerSecondInterestRateSlopeHigh();
    market.borrowPerSecondInterestRateBase = comet.borrowPerSecondInterestRateBase();

    market.storeFrontPriceFactor = comet.storeFrontPriceFactor();
    market.trackingIndexScale = comet.trackingIndexScale();

    market.baseTrackingSupplySpeed = comet.baseTrackingSupplySpeed();
    market.baseTrackingBorrowSpeed = comet.baseTrackingBorrowSpeed();
    market.baseMinForRewards = comet.baseMinForRewards();
    market.baseBorrowMin = comet.baseBorrowMin();
    market.targetReserves = comet.targetReserves();

    // Base asset
    const baseAssetAddress = comet.baseToken();
    const baseAssetId = market.id.concat(baseAssetAddress);

    let baseAsset = BaseAsset.load(baseAssetId);
    if (!baseAsset) {
        baseAsset = new BaseAsset(baseAssetId);

        const baseAssetContract = Erc20Contract.bind(baseAssetAddress);

        baseAsset.address = baseAssetAddress;
        baseAsset.name = baseAssetContract.name();
        baseAsset.symbol = baseAssetContract.symbol();
        baseAsset.decimals = baseAssetContract.decimals();
        baseAsset.market = market.id;
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

            collateralAsset.balance = ZERO_BI;
        }
        collateralAsset.priceFeed = assetConfig.priceFeed;
        collateralAsset.borrowCollateralFactor = formatUnits(assetConfig.borrowCollateralFactor, 18);
        collateralAsset.liquidateCollateralFactor = formatUnits(assetConfig.liquidateCollateralFactor, 18);
        collateralAsset.liquidationFactor = formatUnits(assetConfig.liquidationFactor, 18);
        collateralAsset.supplyCap = assetConfig.supplyCap;

        collateralAsset.save();
    }
}

export function updateMarketIndices(market: Market, event: ethereum.Event): void {
    const comet = CometContract.bind(Address.fromBytes(market.id));
    const totalsBasic = comet.totalsBasic();

    market.baseSupplyIndex = totalsBasic.baseSupplyIndex;
    market.baseBorrowIndex = totalsBasic.baseBorrowIndex;
    market.trackingSupplyIndex = totalsBasic.trackingSupplyIndex;
    market.trackingBorrowIndex = totalsBasic.trackingBorrowIndex;
    market.lastAccrualTime = totalsBasic.lastAccrualTime;
}

export function updateMarketDerivedAccounting(market: Market, event: ethereum.Event): void {
    market.lastAccountingUpdatedBlockNumber = event.block.number;

    market.totalBaseSupply = presentValue(market.totalBasePrincipalSupply, market.baseSupplyIndex);
    market.totalBaseBorrow = presentValue(market.totalBasePrincipalBorrow, market.baseBorrowIndex);

    market.utilization = bigDecimalSafeDiv(
        market.totalBaseBorrow.toBigDecimal(),
        market.totalBaseSupply.toBigDecimal()
    );

    market.supplyApr = computeApr(
        market.utilization,
        market.supplyKink,
        market.supplyPerSecondInterestRateBase,
        market.supplyPerSecondInterestRateSlopeLow,
        market.supplyPerSecondInterestRateSlopeHigh
    );

    market.borrowApr = computeApr(
        market.utilization,
        market.borrowKink,
        market.borrowPerSecondInterestRateBase,
        market.borrowPerSecondInterestRateSlopeLow,
        market.borrowPerSecondInterestRateSlopeHigh
    );
}
