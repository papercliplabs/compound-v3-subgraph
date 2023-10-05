import { Address, BigDecimal, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
    DailyProtocolAccounting,
    HourlyProtocolAccounting,
    Protocol,
    ProtocolAccounting,
    WeeklyProtocolAccounting,
    _ActiveAccount,
} from "../../generated/schema";
import {
    CONFIGURATOR_PROXY_ADDRESS,
    SECONDS_PER_DAY,
    SECONDS_PER_HOUR,
    SECONDS_PER_WEEK,
    ZERO_BD,
} from "../common/constants";

import { getOrCreateUsage } from "./usage";
import { getOrCreateMarket, getOrCreateMarketAccounting } from "./market";
import { bigDecimalSafeDiv } from "../common/utils";

////
// Protocol Accounting
////

export function getOrCreateProtocolAccounting(protocol: Protocol, event: ethereum.Event): ProtocolAccounting {
    const id = protocol.id;
    let protocolAccounting = ProtocolAccounting.load(id);

    if (!protocolAccounting) {
        protocolAccounting = new ProtocolAccounting(id);

        updateProtocolAccounting(protocol, protocolAccounting, event);

        protocolAccounting.save();
    }

    return protocolAccounting;
}

export function updateProtocolAccounting(
    protocol: Protocol,
    accounting: ProtocolAccounting,
    event: ethereum.Event
): void {
    accounting.lastUpdatedBlock = event.block.number;

    let totalSupplyUsd = ZERO_BD;
    let totalBorrowUsd = ZERO_BD;
    let reserveBalanceUsd = ZERO_BD;
    let collateralBalanceUsd = ZERO_BD;
    let collateralReserversBalanceUsd = ZERO_BD;
    let totalReserveBalanceUsd = ZERO_BD;
    let sumSupplyApr = ZERO_BD;
    let sumBorrowApr = ZERO_BD;
    let sumRewardSupplyApr = ZERO_BD;
    let sumRewardBorrowApr = ZERO_BD;
    let sumNetSupplyApr = ZERO_BD;
    let sumNetBorrowApr = ZERO_BD;

    const marketIds = protocol.markets;
    const numMarkets = marketIds.length;
    for (let i = 0; i < numMarkets; i++) {
        const market = getOrCreateMarket(Address.fromBytes(marketIds[i]), event);
        const marketAccounting = getOrCreateMarketAccounting(market, event);

        totalSupplyUsd = totalSupplyUsd.plus(marketAccounting.totalBaseSupplyUsd);
        totalBorrowUsd = totalBorrowUsd.plus(marketAccounting.totalBaseBorrowUsd);
        reserveBalanceUsd = reserveBalanceUsd.plus(marketAccounting.baseReserveBalanceUsd);
        collateralBalanceUsd = collateralBalanceUsd.plus(marketAccounting.collateralBalanceUsd);
        collateralReserversBalanceUsd = collateralReserversBalanceUsd.plus(
            marketAccounting.collateralReservesBalanceUsd
        );
        totalReserveBalanceUsd = totalReserveBalanceUsd.plus(marketAccounting.totalReserveBalanceUsd);
        sumSupplyApr = sumSupplyApr.plus(marketAccounting.supplyApr);
        sumBorrowApr = sumBorrowApr.plus(marketAccounting.borrowApr);
        sumRewardSupplyApr = sumRewardSupplyApr.plus(marketAccounting.rewardSupplyApr);
        sumRewardBorrowApr = sumRewardBorrowApr.plus(marketAccounting.rewardBorrowApr);
        sumNetSupplyApr = sumNetSupplyApr.plus(marketAccounting.netSupplyApr);
        sumNetBorrowApr = sumNetBorrowApr.plus(marketAccounting.netBorrowApr);
    }

    accounting.totalSupplyUsd = totalSupplyUsd;
    accounting.totalBorrowUsd = totalBorrowUsd;
    accounting.reserveBalanceUsd = reserveBalanceUsd;
    accounting.collateralBalanceUsd = collateralBalanceUsd;
    accounting.collateralReservesBalanceUsd = collateralReserversBalanceUsd;
    accounting.totalReserveBalanceUsd = totalReserveBalanceUsd;
    accounting.utilization = bigDecimalSafeDiv(accounting.totalBorrowUsd, accounting.totalSupplyUsd);
    accounting.avgSupplyApr = bigDecimalSafeDiv(sumSupplyApr, BigDecimal.fromString(numMarkets.toString()));
    accounting.avgBorrowApr = bigDecimalSafeDiv(sumBorrowApr, BigDecimal.fromString(numMarkets.toString()));
    accounting.avgRewardSupplyApr = bigDecimalSafeDiv(sumRewardSupplyApr, BigDecimal.fromString(numMarkets.toString()));
    accounting.avgRewardBorrowApr = bigDecimalSafeDiv(sumRewardBorrowApr, BigDecimal.fromString(numMarkets.toString()));
    accounting.avgNetSupplyApr = bigDecimalSafeDiv(sumNetSupplyApr, BigDecimal.fromString(numMarkets.toString()));
    accounting.avgNetBorrowApr = bigDecimalSafeDiv(sumNetBorrowApr, BigDecimal.fromString(numMarkets.toString()));
    accounting.collateralization = bigDecimalSafeDiv(accounting.totalSupplyUsd, accounting.totalBorrowUsd);
    accounting.save();

    createProtocolAccountingSnapshots(accounting, event);
}

function createProtocolAccountingSnapshots(accounting: ProtocolAccounting, event: ethereum.Event): void {
    const hour = event.block.timestamp.div(SECONDS_PER_HOUR);
    const day = event.block.timestamp.div(SECONDS_PER_DAY);
    const week = event.block.timestamp.div(SECONDS_PER_WEEK);

    const hourlyId = Bytes.fromByteArray(Bytes.fromBigInt(hour));
    const dailyId = Bytes.fromByteArray(Bytes.fromBigInt(day));
    const weeklyId = Bytes.fromByteArray(Bytes.fromBigInt(week));

    let hourlyAccounting = HourlyProtocolAccounting.load(hourlyId);
    let dailyAccounting = DailyProtocolAccounting.load(dailyId);
    let weeklyAccounting = WeeklyProtocolAccounting.load(weeklyId);

    if (!hourlyAccounting) {
        const accountingId = hourlyId;

        // Copy existing config
        const copiedAccounting = new ProtocolAccounting(accountingId);

        let entries = accounting.entries;
        for (let i = 0; i < entries.length; ++i) {
            if (entries[i].key.toString() != "id") {
                copiedAccounting.set(entries[i].key, entries[i].value);
            }
        }
        copiedAccounting.save();

        hourlyAccounting = new HourlyProtocolAccounting(hourlyId);
        hourlyAccounting.hour = hour;
        hourlyAccounting.protocol = CONFIGURATOR_PROXY_ADDRESS;
        hourlyAccounting.accounting = copiedAccounting.id;
        hourlyAccounting.save();

        if (!dailyAccounting) {
            dailyAccounting = new DailyProtocolAccounting(hourlyId);
            dailyAccounting.day = day;
            dailyAccounting.protocol = CONFIGURATOR_PROXY_ADDRESS;
            dailyAccounting.accounting = copiedAccounting.id;
            dailyAccounting.save();
        }
        if (!weeklyAccounting) {
            weeklyAccounting = new WeeklyProtocolAccounting(hourlyId);
            weeklyAccounting.week = week;
            weeklyAccounting.protocol = CONFIGURATOR_PROXY_ADDRESS;
            weeklyAccounting.accounting = copiedAccounting.id;
            weeklyAccounting.save();
        }
    }
}

////
// Protocol
////

export function getOrCreateProtocol(event: ethereum.Event): Protocol {
    let protocol = Protocol.load(CONFIGURATOR_PROXY_ADDRESS);

    if (!protocol) {
        protocol = new Protocol(CONFIGURATOR_PROXY_ADDRESS);

        protocol.configuratorProxy = CONFIGURATOR_PROXY_ADDRESS;

        protocol.markets = [];

        const usage = getOrCreateUsage(Bytes.fromUTF8("PROTOCOL_CUMULATIVE"));

        protocol.cumulativeUsage = usage.id;

        const accounting = getOrCreateProtocolAccounting(protocol, event);
        protocol.accounting = accounting.id;

        protocol.save();
    }

    return protocol;
}
