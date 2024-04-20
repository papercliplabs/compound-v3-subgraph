import { Address, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
    Position,
    Market,
    Account,
    PositionAccounting,
    BaseToken,
    CollateralToken,
    PositionAccountingSnapshot,
    PositionCollateralBalance,
} from "../../generated/schema";
import { ZERO_BD, ZERO_BI } from "../common/constants";
import { getOrCreateMarket, getOrCreateMarketAccounting, getOrCreateMarketConfiguration } from "./market";
import { computeTokenValueUsd, presentValue } from "../common/utils";
import { Comet as CometContract } from "../../generated/templates/Comet/Comet";
import { getOrCreateToken, getTokenPriceUsd } from "./token";
import { createPositionCollateralBalanceSnapshot, getOrCreatePositionCollateralBalance, updatePositionCollateralBalanceUsd } from "./collateralBalance";

////
// Position Accounting
////

export function getOrCreatePositionAccounting(position: Position, event: ethereum.Event): PositionAccounting {
    const id = position.id;

    let positionAccounting = PositionAccounting.load(id);

    if (!positionAccounting) {
        positionAccounting = new PositionAccounting(id);

        positionAccounting.position = position.id;

        // Set here to solve init issue, since we optimize to not update when block number didn't change
        positionAccounting.lastUpdatedBlockNumber = ZERO_BI;

        // Set cumulatives
        positionAccounting.cumulativeBaseSupplied = ZERO_BI;
        positionAccounting.cumulativeBaseWithdrawn = ZERO_BI;

        positionAccounting.cumulativeBaseSuppliedUsd = ZERO_BD;
        positionAccounting.cumulativeBaseWithdrawnUsd = ZERO_BD;

        updatePositionAccounting(position, positionAccounting, event);
        positionAccounting.save();
    }

    return positionAccounting;
}

export function updatePositionAccounting(
    position: Position,
    accounting: PositionAccounting,
    event: ethereum.Event
): void {
    if (accounting.lastUpdatedBlockNumber.equals(event.block.number)) {
        // Don't bother to update if we already did this block, assume this gets set on init
        return;
    }

    const market = getOrCreateMarket(Address.fromBytes(position.market), event);
    const marketAccounting = getOrCreateMarketAccounting(market, event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);

    const comet = CometContract.bind(Address.fromBytes(market.id));

    const userBasic = comet.userBasic(Address.fromBytes(position.account));

    accounting.lastUpdatedBlockNumber = event.block.number;
    accounting.basePrincipal = userBasic.getPrincipal();
    accounting.baseBalance = presentValue(
        accounting.basePrincipal,
        accounting.basePrincipal.lt(ZERO_BI) ? marketAccounting.baseBorrowIndex : marketAccounting.baseSupplyIndex
    );
    accounting.baseTrackingIndex = userBasic.getBaseTrackingIndex();
    accounting.baseTrackingAccrued = userBasic.getBaseTrackingAccrued();

    // Base Token Balance USD
    const baseToken = BaseToken.load(marketConfiguration.baseToken)!;
    const baseTokenToken = getOrCreateToken(Address.fromBytes(baseToken.token), event);
    const baseTokenPriceUsd = getTokenPriceUsd(baseToken, event);
    accounting.baseBalanceUsd = computeTokenValueUsd(
        accounting.baseBalance,
        u8(baseTokenToken.decimals),
        baseTokenPriceUsd
    );

    // Collateral Balance USD
    const collateralTokenIds = marketConfiguration.collateralTokens;
    let totalCollateralBalanceUsd = ZERO_BD;
    let collateralBalances: Bytes[] = [];
    for (let i = 0; i < collateralTokenIds.length; i++) {
        const collateralToken = CollateralToken.load(collateralTokenIds[i])!; // Guaranteed to exist
        const collateralBalance = getOrCreatePositionCollateralBalance(collateralToken, position, event);

        updatePositionCollateralBalanceUsd(collateralBalance, event);
        collateralBalance.save();

        collateralBalances.push(collateralBalance.id);

        totalCollateralBalanceUsd = totalCollateralBalanceUsd.plus(collateralBalance.balanceUsd);
    }
    accounting.collateralBalanceUsd = totalCollateralBalanceUsd;
    accounting.collateralBalances = collateralBalances;

    // Create snapshot on change
    createPositionAccountingSnapshots(accounting, event);
}

function createPositionAccountingSnapshots(accounting: PositionAccounting, event: ethereum.Event): void {
    const snapshotId = accounting.position
        .concat(Bytes.fromByteArray(Bytes.fromBigInt(event.block.number)))
        .concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));

    // Copy existing config
    const copiedConfig = new PositionAccounting(snapshotId);

    let entries = accounting.entries;
    for (let i = 0; i < entries.length; ++i) {
        const key = entries[i].key.toString();
        if (key != "id" && key != "collateralBalances") {
            copiedConfig.set(entries[i].key, entries[i].value);
        }
    }

    // Copy collateral balances (needs special handling since we need to deep copy)
    let collateralBalancesSnapshot: Bytes[] = [];
    for(let i = 0; i < accounting.collateralBalances.length; i++) {
        const collateralBalance = PositionCollateralBalance.load(accounting.collateralBalances[i])!; // Guaranteed to exist
        const collateralBalanceSnapshot = createPositionCollateralBalanceSnapshot(collateralBalance, event);
        collateralBalancesSnapshot.push(collateralBalanceSnapshot.id);
    }
    copiedConfig.collateralBalances = collateralBalancesSnapshot;

    copiedConfig.save();

    // Create snapshot
    const positionAccountingSnapshot = new PositionAccountingSnapshot(snapshotId);
    positionAccountingSnapshot.timestamp = event.block.timestamp;
    positionAccountingSnapshot.position = copiedConfig.position;
    positionAccountingSnapshot.accounting = copiedConfig.id;
    positionAccountingSnapshot.save();
}

////
// Position
////

export function getOrCreatePosition(market: Market, account: Account, event: ethereum.Event): Position {
    const id = market.id.concat(account.id);
    let position = Position.load(id);

    if (!position) {
        position = new Position(id);

        position.creationBlockNumber = event.block.number;
        position.market = market.id;
        position.account = account.id;

        const accounting = getOrCreatePositionAccounting(position, event);
        position.accounting = accounting.id;

        position.save();
    }

    return position;
}
