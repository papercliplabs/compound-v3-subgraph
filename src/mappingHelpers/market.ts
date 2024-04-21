import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
    BaseToken,
    CollateralToken,
    DailyMarketAccounting,
    HourlyMarketAccounting,
    Market,
    MarketAccounting,
    MarketCollateralBalance,
    MarketConfiguration,
    MarketConfigurationSnapshot,
    MarketRewardConfiguration,
    Token,
    WeeklyMarketAccounting,
} from "../../generated/schema";
import { Comet as CometContract } from "../../generated/templates/Comet/Comet";
import { Configurator as ConfiguratorContract } from "../../generated/templates/Comet/Configurator";
import {
    BASE_INDEX_SCALE,
    COMET_FACTOR_SCALE,
    DAYS_PER_YEAR,
    REWARD_FACTOR_SCALE,
    SECONDS_PER_DAY,
    SECONDS_PER_HOUR,
    SECONDS_PER_WEEK,
    SECONDS_PER_YEAR,
    ZERO_ADDRESS,
    ZERO_BD,
    ZERO_BI,
} from "../common/constants";
import { bigDecimalSafeDiv, computeTokenValueUsd, formatUnits, getRewardConfigData } from "../common/utils";
import {
    getTokenPriceUsd,
    getOrCreateBaseToken,
    getOrCreateCollateralToken,
    getOrCreateToken,
    updateBaseTokenConfig,
    updateCollateralTokenConfig,
} from "./token";
import { getOrCreateUsage } from "./usage";
import { createMarketCollateralBalanceSnapshot, getOrCreateMarketCollateralBalance, updateMarketCollateralBalanceUsd } from "./collateralBalance";
import { getOrCreateProtocol, getOrCreateProtocolAccounting, updateProtocolAccounting } from "./protocol";
import { getCometRewardAddress, getConfiguratorProxyAddress } from "../common/networkSpecific";

////
// Market Configuration
////

export function getOrCreateMarketConfiguration(market: Market, event: ethereum.Event): MarketConfiguration {
    const id = market.id; // One per market
    let config = MarketConfiguration.load(id);

    if (!config) {
        config = new MarketConfiguration(id);

        updateMarketConfiguration(market, config, event);

        config.save();
    }

    return config;
}

export function updateMarketConfiguration(market: Market, config: MarketConfiguration, event: ethereum.Event): void {
    const comet = CometContract.bind(Address.fromBytes(market.id));
    const configurator = ConfiguratorContract.bind(getConfiguratorProxyAddress());
    const tryFactory = configurator.try_factory(Address.fromBytes(market.id));

    // cometImplementation must be added externally
    config.market = market.id;
    config.lastConfigurationUpdateBlockNumber = event.block.number;
    config.name = comet.name();
    config.symbol = comet.symbol();
    config.factory = tryFactory.reverted ? ZERO_ADDRESS : tryFactory.value;
    config.governor = comet.governor();
    config.pauseGuardian = comet.pauseGuardian();
    config.extensionDelegate = comet.extensionDelegate();

    config.supplyKink = formatUnits(comet.supplyKink(), 18);
    config.supplyPerSecondInterestRateSlopeLow = comet.supplyPerSecondInterestRateSlopeLow();
    config.supplyPerSecondInterestRateSlopeHigh = comet.supplyPerSecondInterestRateSlopeHigh();
    config.supplyPerSecondInterestRateBase = comet.supplyPerSecondInterestRateBase();

    config.borrowKink = formatUnits(comet.borrowKink(), 18);
    config.borrowPerSecondInterestRateSlopeLow = comet.borrowPerSecondInterestRateSlopeLow();
    config.borrowPerSecondInterestRateSlopeHigh = comet.borrowPerSecondInterestRateSlopeHigh();
    config.borrowPerSecondInterestRateBase = comet.borrowPerSecondInterestRateBase();

    config.storeFrontPriceFactor = comet.storeFrontPriceFactor();
    config.trackingIndexScale = comet.trackingIndexScale();

    config.baseTrackingSupplySpeed = comet.baseTrackingSupplySpeed();
    config.baseTrackingBorrowSpeed = comet.baseTrackingBorrowSpeed();
    config.baseMinForRewards = comet.baseMinForRewards();
    config.baseBorrowMin = comet.baseBorrowMin();
    config.targetReserves = comet.targetReserves();

    // Base token
    const baseTokenAddress = comet.baseToken();
    const token = getOrCreateToken(baseTokenAddress, event);
    const baseToken = getOrCreateBaseToken(market, token, event);
    updateBaseTokenConfig(baseToken, event);
    baseToken.save();

    config.baseToken = baseToken.id;

    // Collateral tokens
    const numCollateralTokens = comet.numAssets();
    const collateralTokens: Bytes[] = [];
    for (let i = 0; i < numCollateralTokens; i++) {
        const assetInfo = comet.getAssetInfo(i);
        const token = getOrCreateToken(assetInfo.asset, event);
        const collateralToken = getOrCreateCollateralToken(market, token, event);
        updateCollateralTokenConfig(collateralToken, event);
        collateralToken.save();
        collateralTokens.push(collateralToken.id);
    }
    config.collateralTokens = collateralTokens;

    // Create snapshot of new config on every update
    createMarketConfigurationSnapshot(config, event);
}

function createMarketConfigurationSnapshot(config: MarketConfiguration, event: ethereum.Event): void {
    const snapshotId = Bytes.fromByteArray(Bytes.fromBigInt(event.block.number)).concat(
        Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex))
    );

    // Copy existing config
    const copiedConfig = new MarketConfiguration(snapshotId);

    let entries = config.entries;
    for (let i = 0; i < entries.length; ++i) {
        if (entries[i].key.toString() != "id") {
            copiedConfig.set(entries[i].key, entries[i].value);
        }
    }

    copiedConfig.save();

    // Create snapshot
    const marketConfigSnapshot = new MarketConfigurationSnapshot(snapshotId);
    marketConfigSnapshot.timestamp = event.block.timestamp;
    marketConfigSnapshot.market = config.market;
    marketConfigSnapshot.configuration = copiedConfig.id;
    marketConfigSnapshot.save();
}

export function getOrCreateMarketRewardConfiguration(market: Market, event: ethereum.Event): MarketRewardConfiguration {
    const id = market.id.concat(getCometRewardAddress()); 
    let config = MarketRewardConfiguration.load(id);

    if (!config) {
        config = new MarketRewardConfiguration(id);

        const configData = getRewardConfigData(Address.fromBytes(market.id));
        config.tokenAddress = configData.tokenAddress;
        config.rescaleFactor = configData.rescaleFactor;
        config.shouldUpscale = configData.shouldUpscale;
        config.multiplier = configData.multiplier;
        config.save();
    } else if (config.tokenAddress.equals(ZERO_ADDRESS)) {
        // Check for config
        const configData = getRewardConfigData(Address.fromBytes(market.id));

        if(configData.tokenAddress.notEqual(ZERO_ADDRESS)) {
            config.tokenAddress = configData.tokenAddress;
            config.rescaleFactor = configData.rescaleFactor;
            config.shouldUpscale = configData.shouldUpscale;
            config.multiplier = configData.multiplier;
            config.save();
        }
    }

    return config;
} 

////
// Market Accounting
////

export function getOrCreateMarketAccounting(market: Market, event: ethereum.Event): MarketAccounting {
    const id = market.id; // One per market
    let accounting = MarketAccounting.load(id);

    if (!accounting) {
        accounting = new MarketAccounting(id);

        // Set here to solve init issue, since we optimize to not update when block number didn't change
        accounting.lastAccountingUpdatedBlockNumber = ZERO_BI;

        updateMarketAccounting(market, accounting, event);

        accounting.save();
    }

    return accounting;
}

export function updateMarketAccounting(market: Market, accounting: MarketAccounting, event: ethereum.Event): void {
    if (accounting.lastAccountingUpdatedBlockNumber.equals(event.block.number)) {
        // Don't bother to update if we already did this block, assume this gets set on init
        return;
    }

    const comet = CometContract.bind(Address.fromBytes(market.id));
    const configuration = getOrCreateMarketConfiguration(market, event);
    const rewardConfigData = getOrCreateMarketRewardConfiguration(market, event);

    const totalsBasic = comet.totalsBasic();

    // const rewardConfigData = getRewardConfigData(Address.fromBytes(market.id));

    accounting.market = market.id;
    accounting.lastAccountingUpdatedBlockNumber = event.block.number;

    accounting.baseSupplyIndex = totalsBasic.baseSupplyIndex;
    accounting.baseBorrowIndex = totalsBasic.baseBorrowIndex;
    accounting.trackingSupplyIndex = totalsBasic.trackingSupplyIndex;
    accounting.trackingBorrowIndex = totalsBasic.trackingBorrowIndex;
    accounting.lastAccrualTime = totalsBasic.lastAccrualTime;

    accounting.totalBasePrincipalSupply = totalsBasic.totalSupplyBase;
    accounting.totalBasePrincipalBorrow = totalsBasic.totalBorrowBase;

    accounting.baseReserveBalance = comet.getReserves();

    accounting.totalBaseSupply = comet.totalSupply();
    accounting.totalBaseBorrow = comet.totalBorrow();

    const scaledUtilization = comet.getUtilization();
    accounting.utilization = scaledUtilization.toBigDecimal().div(COMET_FACTOR_SCALE.toBigDecimal());

    const supplyRatePerSec = comet.getSupplyRate(scaledUtilization);
    const borrowRatePerSec = comet.getBorrowRate(scaledUtilization);

    accounting.supplyApr = supplyRatePerSec
        .times(SECONDS_PER_YEAR)
        .toBigDecimal()
        .div(COMET_FACTOR_SCALE.toBigDecimal());
    accounting.borrowApr = borrowRatePerSec
        .times(SECONDS_PER_YEAR)
        .toBigDecimal()
        .div(COMET_FACTOR_SCALE.toBigDecimal());

    const baseToken = BaseToken.load(configuration.baseToken)!; // Guaranteed to exist
    const baseTokenToken = Token.load(baseToken.token)!; // Guaranteed to exist
    const baseTokenDecimals = u8(baseTokenToken.decimals);
    const baseTokenPriceUsd = getTokenPriceUsd(baseToken, event);

    accounting.totalBaseSupplyUsd = computeTokenValueUsd(
        accounting.totalBaseSupply,
        baseTokenDecimals,
        baseTokenPriceUsd
    );
    accounting.totalBaseBorrowUsd = computeTokenValueUsd(
        accounting.totalBaseBorrow,
        baseTokenDecimals,
        baseTokenPriceUsd
    );
    accounting.baseReserveBalanceUsd = computeTokenValueUsd(
        accounting.baseReserveBalance,
        baseTokenDecimals,
        baseTokenPriceUsd
    );

    if (Address.fromBytes(rewardConfigData.tokenAddress).equals(ZERO_ADDRESS)) {
        // No rewards
        accounting.rewardSupplyApr = ZERO_BD;
        accounting.rewardBorrowApr = ZERO_BD;

        accounting.rewardTokenUsdPrice = ZERO_BD;
    } else {
        const rewardToken = getOrCreateToken(Address.fromBytes(rewardConfigData.tokenAddress), event);
        const rewardMultiplier = rewardConfigData.multiplier;

        const supplyRewardTokensPerDay = configuration.baseTrackingSupplySpeed
            .times(BigInt.fromU32(10).pow(u8(rewardToken.decimals)))
            .times(SECONDS_PER_DAY)
            .times(rewardMultiplier)
            .div(REWARD_FACTOR_SCALE)
            .div(BASE_INDEX_SCALE);
        const borrowRewardTokensPerDay = configuration.baseTrackingBorrowSpeed
            .times(BigInt.fromU32(10).pow(u8(rewardToken.decimals)))
            .times(SECONDS_PER_DAY)
            .times(rewardMultiplier)
            .div(REWARD_FACTOR_SCALE)
            .div(BASE_INDEX_SCALE);

        const rewardTokenPriceUsd = getTokenPriceUsd(rewardToken, event);

        const supplyRewardTokenPerDayUsd = computeTokenValueUsd(
            supplyRewardTokensPerDay,
            u8(rewardToken.decimals),
            rewardTokenPriceUsd
        );
        const rewardSupplyYieldPerDay = accounting.totalBaseSupply.gt(configuration.baseMinForRewards)
            ? bigDecimalSafeDiv(supplyRewardTokenPerDayUsd, accounting.totalBaseSupplyUsd)
            : ZERO_BD;

        const borrowRewardTokenPerDayUsd = computeTokenValueUsd(
            borrowRewardTokensPerDay,
            u8(rewardToken.decimals),
            rewardTokenPriceUsd
        );
        const rewardBorrowYieldPerDay = accounting.totalBaseBorrow.gt(configuration.baseMinForRewards)
            ? bigDecimalSafeDiv(borrowRewardTokenPerDayUsd, accounting.totalBaseBorrowUsd)
            : ZERO_BD;

        accounting.rewardSupplyApr = rewardSupplyYieldPerDay.times(DAYS_PER_YEAR.toBigDecimal());
        accounting.rewardBorrowApr = rewardBorrowYieldPerDay.times(DAYS_PER_YEAR.toBigDecimal());

        accounting.rewardTokenUsdPrice = getTokenPriceUsd(rewardToken, event)
    }

    // Collateral USD balances
    const collateralTokenIds = configuration.collateralTokens;

    let totalCollateralBalanceUsd = ZERO_BD;
    let totalCollateralReservesUsd = ZERO_BD;
    let collateralBalances: Bytes[] = [];
    for (let i = 0; i < collateralTokenIds.length; i++) {
        const token = CollateralToken.load(collateralTokenIds[i])!; // Guaranteed to exist
        const collateralBalance = getOrCreateMarketCollateralBalance(token, event);
        updateMarketCollateralBalanceUsd(collateralBalance, event);
        collateralBalance.save();

        collateralBalances.push(collateralBalance.id);

        totalCollateralBalanceUsd = totalCollateralBalanceUsd.plus(collateralBalance.balanceUsd);
        totalCollateralReservesUsd = totalCollateralReservesUsd.plus(collateralBalance.reservesUsd);
    }
    accounting.collateralBalanceUsd = totalCollateralBalanceUsd;
    accounting.collateralReservesBalanceUsd = totalCollateralReservesUsd;
    accounting.collateralBalances = collateralBalances;

    accounting.totalReserveBalanceUsd = accounting.baseReserveBalanceUsd.plus(accounting.collateralReservesBalanceUsd);

    accounting.netSupplyApr = accounting.supplyApr.plus(accounting.rewardSupplyApr);
    accounting.netBorrowApr = accounting.borrowApr.minus(accounting.rewardBorrowApr);

    accounting.collateralization = bigDecimalSafeDiv(
        accounting.totalBaseSupply.toBigDecimal(),
        accounting.totalBaseBorrow.toBigDecimal()
    );


    // Update protocol accounting whenever market accounting changes
    const protocol = getOrCreateProtocol(event);
    const protocolAccounting = getOrCreateProtocolAccounting(protocol, event);
    updateProtocolAccounting(protocol, protocolAccounting, event);

    // Create snapshots (if necessary)
    createMarketAccountingSnapshots(accounting, event);
}

function createMarketAccountingSnapshots(accounting: MarketAccounting, event: ethereum.Event): void {
    const hour = event.block.timestamp.div(SECONDS_PER_HOUR);
    const day = event.block.timestamp.div(SECONDS_PER_DAY);
    const week = event.block.timestamp.div(SECONDS_PER_WEEK);

    const hourlyId = accounting.market.concat(Bytes.fromByteArray(Bytes.fromBigInt(hour)));
    const dailyId = accounting.market.concat(Bytes.fromByteArray(Bytes.fromBigInt(day)));
    const weeklyId = accounting.market.concat(Bytes.fromByteArray(Bytes.fromBigInt(week)));

    let hourlyAccounting = HourlyMarketAccounting.load(hourlyId);
    let dailyAccounting = DailyMarketAccounting.load(dailyId);
    let weeklyAccounting = WeeklyMarketAccounting.load(weeklyId);

    if (!hourlyAccounting || !dailyAccounting || !weeklyAccounting) {
        const accountingId = accounting.market.concat(hourlyId);

        // Copy existing config
        const copiedAccounting = new MarketAccounting(accountingId);

        let entries = accounting.entries;
        for (let i = 0; i < entries.length; ++i) {
        const key = entries[i].key.toString();
            if (key != "id" && key != "collateralBalances") {
                copiedAccounting.set(entries[i].key, entries[i].value);
            }
        }

        // Copy collateral balances (needs special handling since we need to deep copy)
        let collateralBalancesSnapshot: Bytes[] = [];
        for(let i = 0; i < accounting.collateralBalances.length; i++) {
            const collateralBalance = MarketCollateralBalance.load(accounting.collateralBalances[i])!; // Guaranteed to exist
            const collateralBalanceSnapshot = createMarketCollateralBalanceSnapshot(collateralBalance, event);
            collateralBalancesSnapshot.push(collateralBalanceSnapshot.id);
        }
        copiedAccounting.collateralBalances = collateralBalancesSnapshot;

        copiedAccounting.save();

        if (!hourlyAccounting) {
            hourlyAccounting = new HourlyMarketAccounting(hourlyId);
            hourlyAccounting.hour = hour;
            hourlyAccounting.timestamp = event.block.timestamp;
            hourlyAccounting.market = accounting.market;
            hourlyAccounting.accounting = copiedAccounting.id;
            hourlyAccounting.save();
        }

        if (!dailyAccounting) {
            dailyAccounting = new DailyMarketAccounting(dailyId);
            dailyAccounting.day = day;
            dailyAccounting.timestamp = event.block.timestamp;
            dailyAccounting.market = accounting.market;
            dailyAccounting.accounting = copiedAccounting.id;
            dailyAccounting.save();
        }
        if (!weeklyAccounting) {
            weeklyAccounting = new WeeklyMarketAccounting(weeklyId);
            weeklyAccounting.week = week;
            weeklyAccounting.timestamp = event.block.timestamp;
            weeklyAccounting.market = accounting.market;
            weeklyAccounting.accounting = copiedAccounting.id;
            weeklyAccounting.save();
        }
    }
}

////
// Market
////
export function getOrCreateMarket(marketId: Address, event: ethereum.Event): Market {
    let market = Market.load(marketId);

    if (!market) {
        market = new Market(marketId);

        const usage = getOrCreateUsage(Bytes.fromUTF8("MARKET_CUMULATIVE").concat(market.id));

        market.cometProxy = marketId;
        market.protocol = getConfiguratorProxyAddress();
        market.creationBlockNumber = event.block.number;

        market.cumulativeUsage = usage.id;

        const marketConfig = getOrCreateMarketConfiguration(market, event);
        market.configuration = marketConfig.id;

        const marketRewardConfiguration = getOrCreateMarketRewardConfiguration(market, event);
        market.rewardConfiguration = marketRewardConfiguration.id;

        const marketAccounting = getOrCreateMarketAccounting(market, event);
        market.accounting = marketAccounting.id;

        market.save();

        // Add to protocol
        const protocol = getOrCreateProtocol(event);
        const markets = protocol.markets;
        markets.push(market.id);
        protocol.markets = markets;
        protocol.save();
    }

    return market;
}
