import { Address, BigInt, Bytes, ethereum, log } from "@graphprotocol/graph-ts";
import {
    Account,
    Protocol,
    ProtocolDailyUsage,
    ProtocolHourlyUsage,
    Usage,
    _ActiveAccount,
} from "../../generated/schema";
import {
    CONFIGURATOR_PROXY_ADDRESS,
    ONE_BD,
    ONE_BI,
    SECONDS_PER_DAY,
    SECONDS_PER_HOUR,
    TransactionType,
    ZERO_BI,
} from "../common/constants";

export function getOrCreateProtocol(): Protocol {
    let protocol = Protocol.load(CONFIGURATOR_PROXY_ADDRESS);

    if (!protocol) {
        protocol = new Protocol(CONFIGURATOR_PROXY_ADDRESS);

        protocol.configuratorProxy = CONFIGURATOR_PROXY_ADDRESS;

        const usage = getOrCreateUsage(Bytes.fromUTF8("CUMULATIVE"));

        protocol.cumulativeUsage = usage.id;

        protocol.save();
    }

    return protocol;
}

function getOrCreateUsage(id: Bytes): Usage {
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

export function updateProtocolUsageMetrics(account: Account, transactionType: string, event: ethereum.Event): void {
    const day = event.block.timestamp.div(SECONDS_PER_DAY);
    const hour = event.block.timestamp.div(SECONDS_PER_HOUR);

    const protocol = getOrCreateProtocol();

    const newGlobalAcc = tryToCreateActiveAccount(Address.fromBytes(account.id), "");
    const newHourlyAcc = tryToCreateActiveAccount(Address.fromBytes(account.id), "HOUR".concat(hour.toString()));
    const newDailyAcc = tryToCreateActiveAccount(Address.fromBytes(account.id), "DAY".concat(day.toString()));

    const hourlyUsageContainer = getOrCreateProtocolHourlyUsage(hour);
    const dailyUsageContainer = getOrCreateProtocolDailyUsage(day);

    const globalUsage = getOrCreateUsage(protocol.cumulativeUsage);
    const hourlyUsage = getOrCreateUsage(hourlyUsageContainer.usage);
    const dailyUsage = getOrCreateUsage(dailyUsageContainer.usage);

    // Unique accounts
    globalUsage.uniqueUsersCount = globalUsage.uniqueUsersCount.plus(newGlobalAcc ? ONE_BI : ZERO_BI);
    hourlyUsage.uniqueUsersCount = hourlyUsage.uniqueUsersCount.plus(newHourlyAcc ? ONE_BI : ZERO_BI);
    dailyUsage.uniqueUsersCount = dailyUsage.uniqueUsersCount.plus(newDailyAcc ? ONE_BI : ZERO_BI);

    // Update txs
    globalUsage.transactionCount = globalUsage.transactionCount.plus(ONE_BI);
    hourlyUsage.transactionCount = hourlyUsage.transactionCount.plus(ONE_BI);
    dailyUsage.transactionCount = dailyUsage.transactionCount.plus(ONE_BI);
    if (TransactionType.SUPPLY_BASE == transactionType) {
        globalUsage.supplyBaseCount = globalUsage.supplyBaseCount.plus(ONE_BI);
        hourlyUsage.supplyBaseCount = hourlyUsage.supplyBaseCount.plus(ONE_BI);
        dailyUsage.supplyBaseCount = dailyUsage.supplyBaseCount.plus(ONE_BI);
    } else if (TransactionType.WITHDRAW_BASE == transactionType) {
        globalUsage.withdrawBaseCount = globalUsage.withdrawBaseCount.plus(ONE_BI);
        hourlyUsage.withdrawBaseCount = hourlyUsage.withdrawBaseCount.plus(ONE_BI);
        dailyUsage.withdrawBaseCount = dailyUsage.withdrawBaseCount.plus(ONE_BI);
    } else if (TransactionType.LIQUIDATION == transactionType) {
        globalUsage.liquidationCount = globalUsage.liquidationCount.plus(ONE_BI);
        hourlyUsage.liquidationCount = hourlyUsage.liquidationCount.plus(ONE_BI);
        dailyUsage.liquidationCount = dailyUsage.liquidationCount.plus(ONE_BI);
    } else if (TransactionType.SUPPLY_COLLATERAL == transactionType) {
        globalUsage.supplyCollateralCount = globalUsage.supplyCollateralCount.plus(ONE_BI);
        hourlyUsage.supplyCollateralCount = hourlyUsage.supplyCollateralCount.plus(ONE_BI);
        dailyUsage.supplyCollateralCount = dailyUsage.supplyCollateralCount.plus(ONE_BI);
    } else if (TransactionType.WITHDRAW_COLLATERAL == transactionType) {
        globalUsage.withdrawCollateralCount = globalUsage.withdrawCollateralCount.plus(ONE_BI);
        hourlyUsage.withdrawCollateralCount = hourlyUsage.withdrawCollateralCount.plus(ONE_BI);
        dailyUsage.withdrawCollateralCount = dailyUsage.withdrawCollateralCount.plus(ONE_BI);
    } else if (TransactionType.TRANSFER_COLLATERAL == transactionType) {
        globalUsage.transferCollateralCount = globalUsage.transferCollateralCount.plus(ONE_BI);
        hourlyUsage.transferCollateralCount = hourlyUsage.transferCollateralCount.plus(ONE_BI);
        dailyUsage.transferCollateralCount = dailyUsage.transferCollateralCount.plus(ONE_BI);
    } else {
        log.warning("updateProtocolUsageMetrics called with invalid transactionType: {}", [transactionType]);
    }

    globalUsage.save();
    hourlyUsage.save();
    dailyUsage.save();
}
