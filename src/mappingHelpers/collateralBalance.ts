import { Address, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
    CollateralToken,
    MarketCollateralBalance,
    Position,
    PositionCollateralBalance,
    Token,
} from "../../generated/schema";
import { ZERO_BI } from "../common/constants";
import { Comet as CometContract } from "../../generated/templates/Comet/Comet";
import { getOrCreateToken, getTokenPriceUsd } from "./token";
import { computeTokenValueUsd } from "../common/utils";

////
// Market Collateral Balance
////

export function getOrCreateMarketCollateralBalance(
    collateralToken: CollateralToken,
    event: ethereum.Event
): MarketCollateralBalance {
    const id = collateralToken.id.concat(Bytes.fromUTF8("BAL"));
    let collateralBalance = MarketCollateralBalance.load(id);

    if (!collateralBalance) {
        collateralBalance = new MarketCollateralBalance(id);

        collateralBalance.creationBlockNumber = event.block.number;
        collateralBalance.collateralToken = collateralToken.id;
        collateralBalance.market = collateralToken.market;

        updateMarketCollateralBalance(collateralBalance, event);
        updateMarketCollateralBalanceUsd(collateralBalance, event);

        collateralBalance.save();
    }

    return collateralBalance;
}

export function updateMarketCollateralBalance(collateralBalance: MarketCollateralBalance, event: ethereum.Event): void {
    const comet = CometContract.bind(Address.fromBytes(collateralBalance.market));
    const collateralToken = CollateralToken.load(collateralBalance.collateralToken)!; // Guaranteed to exist
    const collateralTokenToken = getOrCreateToken(Address.fromBytes(collateralToken.token), event);
    const totalsCollateral = comet.totalsCollateral(Address.fromBytes(collateralToken.token));

    collateralBalance.lastUpdateBlockNumber = event.block.number;
    collateralBalance.balance = totalsCollateral.getTotalSupplyAsset();

    const tryGetReserves = comet.try_getCollateralReserves(Address.fromBytes(collateralTokenToken.address));
    collateralBalance.reserves = tryGetReserves.reverted ? ZERO_BI : tryGetReserves.value;
}

export function createMarketCollateralBalanceSnapshot(
    collateralBalance: MarketCollateralBalance,
    event: ethereum.Event
): MarketCollateralBalance {
    const snapshotId = collateralBalance.id
        .concat(Bytes.fromByteArray(Bytes.fromBigInt(event.block.number)))
        .concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));

    // Copy existing config
    const copiedConfig = new MarketCollateralBalance(snapshotId);

    let entries = collateralBalance.entries;
    for (let i = 0; i < entries.length; ++i) {
        if (entries[i].key.toString() != "id") {
            copiedConfig.set(entries[i].key, entries[i].value);
        }
    }

    copiedConfig.save();

    return copiedConfig;
}

// Update just the USD value of balance based on newest price and existing balance
export function updateMarketCollateralBalanceUsd(
    collateralBalance: MarketCollateralBalance,
    event: ethereum.Event
): void {
    const collateralToken = CollateralToken.load(collateralBalance.collateralToken)!;
    const collateralTokenToken = getOrCreateToken(Address.fromBytes(collateralToken.token), event);
    const price = getTokenPriceUsd(collateralToken, event);

    collateralBalance.lastUpdateBlockNumber = event.block.number;
    collateralBalance.balanceUsd = computeTokenValueUsd(
        collateralBalance.balance,
        u8(collateralTokenToken.decimals),
        price
    );
    collateralBalance.reservesUsd = computeTokenValueUsd(
        collateralBalance.reserves,
        u8(collateralTokenToken.decimals),
        price
    );
}

////
// Position Collateral Balance
////

export function getOrCreatePositionCollateralBalance(
    collateralToken: CollateralToken,
    position: Position,
    event: ethereum.Event
): PositionCollateralBalance {
    const id = position.id.concat(collateralToken.id);
    let collateralBalance = PositionCollateralBalance.load(id);

    if (!collateralBalance) {
        collateralBalance = new PositionCollateralBalance(id);

        collateralBalance.creationBlockNumber = event.block.number;
        collateralBalance.collateralToken = collateralToken.id;
        collateralBalance.position = position.id;

        updatePositionCollateralBalance(position, collateralBalance, event);
        updatePositionCollateralBalanceUsd(collateralBalance, event);

        collateralBalance.save();
    }

    return collateralBalance;
}

export function updatePositionCollateralBalance(
    position: Position,
    collateralBalance: PositionCollateralBalance,
    event: ethereum.Event
): void {
    const collateralToken = CollateralToken.load(collateralBalance.collateralToken)!; // Guaranteed to exist
    const comet = CometContract.bind(Address.fromBytes(position.market));

    const userCollateral = comet.userCollateral(
        Address.fromBytes(position.account),
        Address.fromBytes(collateralToken.token)
    );

    collateralBalance.lastUpdateBlockNumber = event.block.number;
    collateralBalance.balance = userCollateral.getBalance();
}

export function createPositionCollateralBalanceSnapshot(
    collateralBalance: PositionCollateralBalance,
    event: ethereum.Event
): PositionCollateralBalance {
    const snapshotId = collateralBalance.id
        .concat(Bytes.fromByteArray(Bytes.fromBigInt(event.block.number)))
        .concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));

    // Copy existing config
    const copiedConfig = new PositionCollateralBalance(snapshotId);

    let entries = collateralBalance.entries;
    for (let i = 0; i < entries.length; ++i) {
        if (entries[i].key.toString() != "id") {
            copiedConfig.set(entries[i].key, entries[i].value);
        }
    }

    copiedConfig.save();

    return copiedConfig;
}

export function updatePositionCollateralBalanceUsd(
    collateralBalance: PositionCollateralBalance,
    event: ethereum.Event
): void {
    const collateralToken = CollateralToken.load(collateralBalance.collateralToken)!;
    const collateralTokenToken = getOrCreateToken(Address.fromBytes(collateralToken.token), event);
    const price = getTokenPriceUsd(collateralToken, event);

    collateralBalance.lastUpdateBlockNumber = event.block.number;
    collateralBalance.balanceUsd = computeTokenValueUsd(
        collateralBalance.balance,
        u8(collateralTokenToken.decimals),
        price
    );
}
