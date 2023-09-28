import { Address, ethereum } from "@graphprotocol/graph-ts";
import { BaseAsset, CollateralAsset, Market } from "../../generated/schema";
import { Comet as CometContract } from "../../generated/templates/Comet/Comet";
import { Configurator as ConfiguratorContract } from "../../generated/templates/Comet/Configurator";
import { Erc20 as Erc20Contract } from "../../generated/templates/Comet/Erc20";
import { CONFIGURATOR_PROXY_ADDRESS } from "../common/constants";
import { bigDecimalSafeDiv, computeApr, formatUnits, presentValue } from "../common/utils";
import { getOrCreateCollateralAsset, updateCollateralAssetConfig } from "./collateral";

export function getOrCreateMarket(marketId: Address, event: ethereum.Event): Market {
    let market = Market.load(marketId);

    if (!market) {
        market = new Market(marketId);

        market.cometProxy = marketId;
        market.protocol = CONFIGURATOR_PROXY_ADDRESS;
        market.creationBlockNumber = event.block.number;

        updateMarketConfiguration(market, event);
        updateMarketAccounting(market, event);

        market.save();
    }

    return market;
}

export function updateMarketConfiguration(market: Market, event: ethereum.Event): void {
    const comet = CometContract.bind(Address.fromBytes(market.id));
    const configurator = ConfiguratorContract.bind(Address.fromBytes(market.protocol));

    market.lastConfigurationUpdateBlockNumber = event.block.number;
    market.factory = configurator.factory(Address.fromBytes(market.id));
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
    const numCollateralAssets = comet.numAssets();
    for (let i = 0; i < numCollateralAssets; i++) {
        const assetInfo = comet.getAssetInfo(i);
        const collateralAsset = getOrCreateCollateralAsset(market, assetInfo.asset, event);
        updateCollateralAssetConfig(collateralAsset);
        collateralAsset.save();
    }
}

export function updateMarketAccounting(market: Market, event: ethereum.Event): void {
    const comet = CometContract.bind(Address.fromBytes(market.id));

    const totalsBasic = comet.totalsBasic();

    market.lastAccountingUpdatedBlockNumber = event.block.number;

    market.baseSupplyIndex = totalsBasic.baseSupplyIndex;
    market.baseBorrowIndex = totalsBasic.baseBorrowIndex;
    market.trackingSupplyIndex = totalsBasic.trackingSupplyIndex;
    market.trackingBorrowIndex = totalsBasic.trackingBorrowIndex;
    market.lastAccrualTime = totalsBasic.lastAccrualTime;

    market.totalBasePrincipalSupply = totalsBasic.totalSupplyBase;
    market.totalBasePrincipalBorrow = totalsBasic.totalBorrowBase;

    market.baseReserveBalance = comet.getReserves();

    // Derived
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
