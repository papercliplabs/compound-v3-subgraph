import { Address, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { BaseToken, Market, Token } from "../../generated/schema";
import { Comet as CometContract } from "../../generated/templates/Comet/Comet";
import { Configurator as ConfiguratorContract } from "../../generated/templates/Comet/Configurator";
import {
    BLOCKS_PER_DAY,
    CONFIGURATOR_PROXY_ADDRESS,
    DAYS_PER_YEAR,
    ONE_BD,
    ONE_BI,
    REWARD_FACTOR_SCALE,
    ZERO_BD,
    ZERO_BI,
} from "../common/constants";
import {
    bigDecimalSafeDiv,
    computeApr,
    computeTokenValueUsd,
    formatUnits,
    getRewardConfigData,
    presentValue,
} from "../common/utils";
import {
    getTokenPriceUsd,
    getOrCreateBaseToken,
    getOrCreateCollateralToken,
    getOrCreateToken,
    updateBaseTokenConfig,
    updateCollateralTokenConfig,
} from "./token";
import { getOrCreateUsage } from "./usage";

export function getOrCreateMarket(marketId: Address, event: ethereum.Event): Market {
    let market = Market.load(marketId);

    if (!market) {
        market = new Market(marketId);

        const usage = getOrCreateUsage(Bytes.fromUTF8("MARKET_CUMULATIVE").concat(market.id));

        market.cometProxy = marketId;
        market.protocol = CONFIGURATOR_PROXY_ADDRESS;
        market.creationBlockNumber = event.block.number;

        market.cumulativeUsage = usage.id;

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

    // Base token
    const baseTokenAddress = comet.baseToken();
    const token = getOrCreateToken(baseTokenAddress, event);
    const baseToken = getOrCreateBaseToken(market, token, event);
    updateBaseTokenConfig(baseToken, event);
    baseToken.save();

    market.baseToken = baseToken.id;

    // Collateral tokens
    const numCollateralTokens = comet.numAssets();
    for (let i = 0; i < numCollateralTokens; i++) {
        const assetInfo = comet.getAssetInfo(i);
        const token = getOrCreateToken(assetInfo.asset, event);
        const collateralToken = getOrCreateCollateralToken(market, token, event);
        updateCollateralTokenConfig(collateralToken, event);
        collateralToken.save();
    }
}

export function updateMarketAccounting(market: Market, event: ethereum.Event): void {
    const comet = CometContract.bind(Address.fromBytes(market.id));

    const totalsBasic = comet.totalsBasic();

    const rewardConfigData = getRewardConfigData(Address.fromBytes(market.id));

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

    const baseToken = BaseToken.load(market.baseToken)!; // Guaranteed to exist
    const baseTokenToken = Token.load(baseToken.token)!; // Guaranteed to exist
    const baseTokenDecimals = u8(baseTokenToken.decimals);
    const baseTokenPriceUsd = getTokenPriceUsd(baseToken, event);

    market.totalBaseSupplyUsd = computeTokenValueUsd(market.totalBaseSupply, baseTokenDecimals, baseTokenPriceUsd);
    market.totalBaseBorrowUsd = computeTokenValueUsd(market.totalBaseBorrow, baseTokenDecimals, baseTokenPriceUsd);
    market.baseReserveBalanceUsd = computeTokenValueUsd(
        market.baseReserveBalance,
        baseTokenDecimals,
        baseTokenPriceUsd
    );

    if (rewardConfigData.tokenAddress == Address.zero()) {
        // No rewards
        market.rewardSupplyApr = ZERO_BD;
        market.rewardBorrowApr = ZERO_BD;
    } else {
        const rewardToken = getOrCreateToken(rewardConfigData.tokenAddress, event);

        const rewardRescaleFactor = rewardConfigData.rescaleFactor;
        const shouldUpscale = rewardConfigData.shouldUpscale;
        const rewardMultiplier = rewardConfigData.multiplier;

        const baseTrackingSupplyPerDay = market.baseTrackingSupplySpeed.times(BLOCKS_PER_DAY);
        const baseTrackingBorrowPerDay = market.baseTrackingBorrowSpeed.times(BLOCKS_PER_DAY);

        let supplyRewardTokensPerDay = ZERO_BI;
        let borrowRewardTokensPerDay = ZERO_BI;
        if (shouldUpscale) {
            supplyRewardTokensPerDay = baseTrackingSupplyPerDay
                .times(rewardRescaleFactor)
                .times(rewardMultiplier)
                .div(REWARD_FACTOR_SCALE);
            borrowRewardTokensPerDay = baseTrackingBorrowPerDay
                .times(rewardRescaleFactor)
                .times(rewardMultiplier)
                .div(REWARD_FACTOR_SCALE);
        } else {
            supplyRewardTokensPerDay = baseTrackingSupplyPerDay
                .div(rewardRescaleFactor)
                .times(rewardMultiplier)
                .div(REWARD_FACTOR_SCALE);
            borrowRewardTokensPerDay = baseTrackingBorrowPerDay
                .div(rewardRescaleFactor)
                .times(rewardMultiplier)
                .div(REWARD_FACTOR_SCALE);
        }

        const rewardTokenPriceUsd = getTokenPriceUsd(rewardToken, event);

        const supplyRewardTokenPerDayUsd = computeTokenValueUsd(
            supplyRewardTokensPerDay,
            u8(rewardToken.decimals),
            rewardTokenPriceUsd
        );
        const rewardSupplyYieldPerDay = market.totalBaseSupply.gt(market.baseMinForRewards)
            ? bigDecimalSafeDiv(supplyRewardTokenPerDayUsd, market.totalBaseSupplyUsd)
            : ZERO_BD;

        const borrowRewardTokenPerDayUsd = computeTokenValueUsd(
            borrowRewardTokensPerDay,
            u8(rewardToken.decimals),
            rewardTokenPriceUsd
        );
        const rewardBorrowYieldPerDay = market.totalBaseBorrow.gt(market.baseMinForRewards)
            ? bigDecimalSafeDiv(borrowRewardTokenPerDayUsd, market.totalBaseBorrowUsd)
            : ZERO_BD;

        market.rewardSupplyApr = rewardSupplyYieldPerDay.times(DAYS_PER_YEAR.toBigDecimal());
        market.rewardBorrowApr = rewardBorrowYieldPerDay.times(DAYS_PER_YEAR.toBigDecimal());
    }

    market.netSupplyApr = market.supplyApr.plus(market.rewardBorrowApr);
    market.netBorrowApr = market.borrowApr.minus(market.rewardBorrowApr);
}
