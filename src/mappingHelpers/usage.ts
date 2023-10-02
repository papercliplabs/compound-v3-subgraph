import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import {
    Account,
    Market,
    MarketDailyUsage,
    MarketHourlyUsage,
    ProtocolDailyUsage,
    ProtocolHourlyUsage,
    Usage,
    _ActiveAccount,
} from "../../generated/schema";
import {
    CONFIGURATOR_PROXY_ADDRESS,
    ONE_BI,
    SECONDS_PER_DAY,
    SECONDS_PER_HOUR,
    TransactionType,
    ZERO_BI,
} from "../common/constants";
import { getOrCreateProtocol } from "./protocol";

export function getOrCreateUsage(id: Bytes): Usage {
    let usage = Usage.load(id);

    if (!usage) {
        usage = new Usage(id);

        usage.protocol = CONFIGURATOR_PROXY_ADDRESS;

        usage.uniqueUsersCount = ZERO_BI;
        usage.transactionCount = ZERO_BI;
        usage.supplyBaseCount = ZERO_BI;
        usage.withdrawBaseCount = ZERO_BI;
        usage.liquidationCount = ZERO_BI;
        usage.supplyCollateralCount = ZERO_BI;
        usage.withdrawCollateralCount = ZERO_BI;
        usage.transferCollateralCount = ZERO_BI;

        usage.save();
    }

    return usage;
}

function getOrCreateProtocolHourlyUsage(hour: BigInt): ProtocolHourlyUsage {
    const id = Bytes.fromByteArray(Bytes.fromBigInt(hour));
    let hourlyUsage = ProtocolHourlyUsage.load(id);

    if (!hourlyUsage) {
        hourlyUsage = new ProtocolHourlyUsage(id);

        const protocol = getOrCreateProtocol();
        const usage = getOrCreateUsage(Bytes.fromUTF8("PROTOCOL_HOUR").concat(id));

        hourlyUsage.protocol = protocol.id;
        hourlyUsage.hour = hour;
        hourlyUsage.usage = usage.id;

        hourlyUsage.save();
    }

    return hourlyUsage;
}

function getOrCreateProtocolDailyUsage(day: BigInt): ProtocolDailyUsage {
    const id = Bytes.fromByteArray(Bytes.fromBigInt(day));
    let dailyUsage = ProtocolDailyUsage.load(id);

    if (!dailyUsage) {
        dailyUsage = new ProtocolDailyUsage(id);

        const protocol = getOrCreateProtocol();
        const usage = getOrCreateUsage(Bytes.fromUTF8("PROTOCOL_DAY").concat(id));

        dailyUsage.protocol = protocol.id;
        dailyUsage.day = day;
        dailyUsage.usage = usage.id;

        dailyUsage.save();
    }

    return dailyUsage;
}

function getOrCreateMarketDailyUsage(market: Market, day: BigInt): MarketDailyUsage {
    const id = market.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(day)));
    let dailyUsage = MarketDailyUsage.load(id);

    if (!dailyUsage) {
        dailyUsage = new MarketDailyUsage(id);

        const usage = getOrCreateUsage(id);

        dailyUsage.market = market.id;
        dailyUsage.day = day;
        dailyUsage.usage = usage.id;

        dailyUsage.save();
    }

    return dailyUsage;
}

function getOrCreateMarketHourlyUsage(market: Market, hour: BigInt): MarketHourlyUsage {
    const id = market.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(hour)));
    let hourlyUsage = MarketHourlyUsage.load(id);

    if (!hourlyUsage) {
        hourlyUsage = new MarketHourlyUsage(id);

        const usage = getOrCreateUsage(id);

        hourlyUsage.market = market.id;
        hourlyUsage.hour = hour;
        hourlyUsage.usage = usage.id;

        hourlyUsage.save();
    }

    return hourlyUsage;
}

function tryToCreateActiveAccount(address: Address, metadata: string): boolean {
    const id = address.concat(Bytes.fromUTF8(metadata));
    let activeAccount = _ActiveAccount.load(id);

    let newAcc = false;
    if (!activeAccount) {
        activeAccount = new _ActiveAccount(id);
        activeAccount.save();
        newAcc = true;
    }

    return newAcc;
}

export function updateUsageMetrics(
    account: Account,
    market: Market,
    transactionType: string,
    event: ethereum.Event
): void {
    const day = event.block.timestamp.div(SECONDS_PER_DAY);
    const hour = event.block.timestamp.div(SECONDS_PER_HOUR);

    const protocol = getOrCreateProtocol();

    const newProtocolCumulativeAcc = tryToCreateActiveAccount(Address.fromBytes(account.id), "PROTOCOL");
    const newProtocolHourlyAcc = tryToCreateActiveAccount(
        Address.fromBytes(account.id),
        "PROTOCOL_HOUR".concat(hour.toString())
    );
    const newProtocolDailyAcc = tryToCreateActiveAccount(
        Address.fromBytes(account.id),
        "PROTOCOL_DAY".concat(day.toString())
    );

    const baseMarketAccId = "MARKET".concat(market.id.toHexString());
    const newMarketCumulativeAcc = tryToCreateActiveAccount(Address.fromBytes(account.id), baseMarketAccId);
    const newMarketHourlyAcc = tryToCreateActiveAccount(
        Address.fromBytes(account.id),
        baseMarketAccId.concat(hour.toString())
    );
    const newMarketDailyAcc = tryToCreateActiveAccount(
        Address.fromBytes(account.id),
        baseMarketAccId.concat(day.toString())
    );

    const protocolHourlyUsageContainer = getOrCreateProtocolHourlyUsage(hour);
    const protocolDailyUsageContainer = getOrCreateProtocolDailyUsage(day);

    const marketHourlyUsageContainer = getOrCreateMarketHourlyUsage(market, hour);
    const marketDailyUsageContainer = getOrCreateMarketDailyUsage(market, day);

    const protocolCumulativeUsage = getOrCreateUsage(protocol.cumulativeUsage);
    const protocolHourlyUsage = getOrCreateUsage(protocolHourlyUsageContainer.usage);
    const protocolDailyUsage = getOrCreateUsage(protocolDailyUsageContainer.usage);

    const marketCumulativeUsage = getOrCreateUsage(market.cumulativeUsage);
    const marketHourlyUsage = getOrCreateUsage(marketHourlyUsageContainer.usage);
    const marketDailyUsage = getOrCreateUsage(marketDailyUsageContainer.usage);

    // Unique accounts
    protocolCumulativeUsage.uniqueUsersCount = protocolCumulativeUsage.uniqueUsersCount.plus(
        newProtocolCumulativeAcc ? ONE_BI : ZERO_BI
    );
    protocolHourlyUsage.uniqueUsersCount = protocolHourlyUsage.uniqueUsersCount.plus(
        newProtocolHourlyAcc ? ONE_BI : ZERO_BI
    );
    protocolDailyUsage.uniqueUsersCount = protocolDailyUsage.uniqueUsersCount.plus(
        newProtocolDailyAcc ? ONE_BI : ZERO_BI
    );

    marketCumulativeUsage.uniqueUsersCount = marketCumulativeUsage.uniqueUsersCount.plus(
        newMarketCumulativeAcc ? ONE_BI : ZERO_BI
    );
    marketHourlyUsage.uniqueUsersCount = marketHourlyUsage.uniqueUsersCount.plus(newMarketHourlyAcc ? ONE_BI : ZERO_BI);
    marketDailyUsage.uniqueUsersCount = marketDailyUsage.uniqueUsersCount.plus(newMarketDailyAcc ? ONE_BI : ZERO_BI);

    // Update txs
    protocolCumulativeUsage.transactionCount = protocolCumulativeUsage.transactionCount.plus(ONE_BI);
    protocolHourlyUsage.transactionCount = protocolHourlyUsage.transactionCount.plus(ONE_BI);
    protocolDailyUsage.transactionCount = protocolDailyUsage.transactionCount.plus(ONE_BI);
    marketCumulativeUsage.transactionCount = marketCumulativeUsage.transactionCount.plus(ONE_BI);
    marketHourlyUsage.transactionCount = marketHourlyUsage.transactionCount.plus(ONE_BI);
    marketDailyUsage.transactionCount = marketDailyUsage.transactionCount.plus(ONE_BI);
    if (TransactionType.SUPPLY_BASE == transactionType) {
        protocolCumulativeUsage.supplyBaseCount = protocolCumulativeUsage.supplyBaseCount.plus(ONE_BI);
        protocolHourlyUsage.supplyBaseCount = protocolHourlyUsage.supplyBaseCount.plus(ONE_BI);
        protocolDailyUsage.supplyBaseCount = protocolDailyUsage.supplyBaseCount.plus(ONE_BI);
        marketCumulativeUsage.supplyBaseCount = marketCumulativeUsage.supplyBaseCount.plus(ONE_BI);
        marketHourlyUsage.supplyBaseCount = marketHourlyUsage.supplyBaseCount.plus(ONE_BI);
        marketDailyUsage.supplyBaseCount = marketDailyUsage.supplyBaseCount.plus(ONE_BI);
    } else if (TransactionType.WITHDRAW_BASE == transactionType) {
        protocolCumulativeUsage.withdrawBaseCount = protocolCumulativeUsage.withdrawBaseCount.plus(ONE_BI);
        protocolHourlyUsage.withdrawBaseCount = protocolHourlyUsage.withdrawBaseCount.plus(ONE_BI);
        protocolDailyUsage.withdrawBaseCount = protocolDailyUsage.withdrawBaseCount.plus(ONE_BI);
        marketCumulativeUsage.withdrawBaseCount = marketCumulativeUsage.withdrawBaseCount.plus(ONE_BI);
        marketHourlyUsage.withdrawBaseCount = marketHourlyUsage.withdrawBaseCount.plus(ONE_BI);
        marketDailyUsage.withdrawBaseCount = marketDailyUsage.withdrawBaseCount.plus(ONE_BI);
    } else if (TransactionType.LIQUIDATION == transactionType) {
        protocolCumulativeUsage.liquidationCount = protocolCumulativeUsage.liquidationCount.plus(ONE_BI);
        protocolHourlyUsage.liquidationCount = protocolHourlyUsage.liquidationCount.plus(ONE_BI);
        protocolDailyUsage.liquidationCount = protocolDailyUsage.liquidationCount.plus(ONE_BI);
        marketCumulativeUsage.liquidationCount = marketCumulativeUsage.liquidationCount.plus(ONE_BI);
        marketHourlyUsage.liquidationCount = marketHourlyUsage.liquidationCount.plus(ONE_BI);
        marketDailyUsage.liquidationCount = marketDailyUsage.liquidationCount.plus(ONE_BI);
    } else if (TransactionType.SUPPLY_COLLATERAL == transactionType) {
        protocolCumulativeUsage.supplyCollateralCount = protocolCumulativeUsage.supplyCollateralCount.plus(ONE_BI);
        protocolHourlyUsage.supplyCollateralCount = protocolHourlyUsage.supplyCollateralCount.plus(ONE_BI);
        protocolDailyUsage.supplyCollateralCount = protocolDailyUsage.supplyCollateralCount.plus(ONE_BI);
        marketCumulativeUsage.supplyCollateralCount = marketCumulativeUsage.supplyCollateralCount.plus(ONE_BI);
        marketHourlyUsage.supplyCollateralCount = marketHourlyUsage.supplyCollateralCount.plus(ONE_BI);
        marketDailyUsage.supplyCollateralCount = marketDailyUsage.supplyCollateralCount.plus(ONE_BI);
    } else if (TransactionType.WITHDRAW_COLLATERAL == transactionType) {
        protocolCumulativeUsage.withdrawCollateralCount = protocolCumulativeUsage.withdrawCollateralCount.plus(ONE_BI);
        protocolHourlyUsage.withdrawCollateralCount = protocolHourlyUsage.withdrawCollateralCount.plus(ONE_BI);
        protocolDailyUsage.withdrawCollateralCount = protocolDailyUsage.withdrawCollateralCount.plus(ONE_BI);
        marketCumulativeUsage.withdrawCollateralCount = marketCumulativeUsage.withdrawCollateralCount.plus(ONE_BI);
        marketHourlyUsage.withdrawCollateralCount = marketHourlyUsage.withdrawCollateralCount.plus(ONE_BI);
        marketDailyUsage.withdrawCollateralCount = marketDailyUsage.withdrawCollateralCount.plus(ONE_BI);
    } else if (TransactionType.TRANSFER_COLLATERAL == transactionType) {
        protocolCumulativeUsage.transferCollateralCount = protocolCumulativeUsage.transferCollateralCount.plus(ONE_BI);
        protocolHourlyUsage.transferCollateralCount = protocolHourlyUsage.transferCollateralCount.plus(ONE_BI);
        protocolDailyUsage.transferCollateralCount = protocolDailyUsage.transferCollateralCount.plus(ONE_BI);
        marketCumulativeUsage.transferCollateralCount = marketCumulativeUsage.transferCollateralCount.plus(ONE_BI);
        marketHourlyUsage.transferCollateralCount = marketHourlyUsage.transferCollateralCount.plus(ONE_BI);
        marketDailyUsage.transferCollateralCount = marketDailyUsage.transferCollateralCount.plus(ONE_BI);
    } else {
        log.warning("updateUsageMetrics called with invalid transactionType: {}", [transactionType]);
    }

    protocolCumulativeUsage.save();
    protocolHourlyUsage.save();
    protocolDailyUsage.save();
    marketCumulativeUsage.save();
    marketHourlyUsage.save();
    marketDailyUsage.save();
}
