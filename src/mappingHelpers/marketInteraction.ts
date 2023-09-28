import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
    Market,
    Position,
    SupplyBaseMarketInteraction,
    WithdrawBaseMarketInteraction,
    AbsorbDebtMarketInteraction,
    SupplyCollateralMarketInteraction,
    CollateralAsset,
    WithdrawCollateralMarketInteraction,
    TransferCollateralMarketInteraction,
    AbsorbCollateralMarketInteraction,
} from "../../generated/schema";
import { ZERO_BD } from "../common/constants";

export function createSupplyBaseMarketInteraction(
    market: Market,
    position: Position,
    from: Address,
    amount: BigInt,
    event: ethereum.Event
): void {
    const id = event.transaction.hash.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));
    const interaction = new SupplyBaseMarketInteraction(id);

    interaction.hash = event.transaction.hash;
    interaction.logIndex = event.logIndex;
    interaction.blockNumber = event.block.number;
    interaction.timestamp = event.block.timestamp;

    interaction.from = from;
    interaction.to = market.id;

    interaction.market = market.id;
    interaction.position = position.id;

    interaction.asset = market.baseAsset;
    interaction.amount = amount;
    interaction.amountUsd = ZERO_BD; // TODO

    interaction.save();
}

export function createWithdrawBaseMarketInteraction(
    market: Market,
    position: Position,
    to: Address,
    amount: BigInt,
    event: ethereum.Event
): void {
    const id = event.transaction.hash.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));
    const interaction = new WithdrawBaseMarketInteraction(id);

    interaction.hash = event.transaction.hash;
    interaction.logIndex = event.logIndex;
    interaction.blockNumber = event.block.number;
    interaction.timestamp = event.block.timestamp;

    interaction.from = market.id;
    interaction.to = to;

    interaction.market = market.id;
    interaction.position = position.id;

    interaction.asset = market.baseAsset;
    interaction.amount = amount;
    interaction.amountUsd = ZERO_BD; // TODO

    interaction.save();
}

export function createAbsorbDebtMarketInteraction(
    market: Market,
    position: Position,
    absorber: Address,
    amount: BigInt,
    event: ethereum.Event
): void {
    const id = event.transaction.hash.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));
    const interaction = new AbsorbDebtMarketInteraction(id);

    interaction.hash = event.transaction.hash;
    interaction.logIndex = event.logIndex;
    interaction.blockNumber = event.block.number;
    interaction.timestamp = event.block.timestamp;

    // There is no actual exchange of value
    // Just internal accounting to have reserves cover bad debt, and protocol takes collateral ownership
    interaction.from = market.id;
    interaction.to = market.id;

    interaction.market = market.id;
    interaction.position = position.id;

    interaction.asset = market.baseAsset;
    interaction.amount = amount;
    interaction.amountUsd = ZERO_BD; // TODO

    interaction.absorber = absorber;

    interaction.save();
}

export function createSupplyCollateralMarketInteraction(
    market: Market,
    position: Position,
    from: Address,
    asset: CollateralAsset,
    amount: BigInt,
    event: ethereum.Event
): void {
    const id = event.transaction.hash.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));
    const interaction = new SupplyCollateralMarketInteraction(id);

    interaction.hash = event.transaction.hash;
    interaction.logIndex = event.logIndex;
    interaction.blockNumber = event.block.number;
    interaction.timestamp = event.block.timestamp;

    interaction.from = from;
    interaction.to = market.id;

    interaction.market = market.id;
    interaction.position = position.id;

    interaction.asset = asset.id;
    interaction.amount = amount;
    interaction.amountUsd = ZERO_BD; // TODO

    interaction.save();
}

export function createWithdrawCollateralMarketInteraction(
    market: Market,
    position: Position,
    to: Address,
    asset: CollateralAsset,
    amount: BigInt,
    event: ethereum.Event
): void {
    const id = event.transaction.hash.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));
    const interaction = new WithdrawCollateralMarketInteraction(id);

    interaction.hash = event.transaction.hash;
    interaction.logIndex = event.logIndex;
    interaction.blockNumber = event.block.number;
    interaction.timestamp = event.block.timestamp;

    interaction.from = market.id;
    interaction.to = to;

    interaction.market = market.id;
    interaction.position = position.id;

    interaction.asset = asset.id;
    interaction.amount = amount;
    interaction.amountUsd = ZERO_BD; // TODO

    interaction.save();
}

export function createTransferCollateralMarketInteraction(
    market: Market,
    fromPosition: Position,
    toPosition: Position,
    asset: CollateralAsset,
    amount: BigInt,
    event: ethereum.Event
): void {
    const id = event.transaction.hash.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));
    const interaction = new TransferCollateralMarketInteraction(id);

    interaction.hash = event.transaction.hash;
    interaction.logIndex = event.logIndex;
    interaction.blockNumber = event.block.number;
    interaction.timestamp = event.block.timestamp;

    // Not value moved, stayed within the market
    interaction.from = market.id;
    interaction.to = market.id;

    interaction.market = market.id;
    interaction.fromPosition = fromPosition.id;
    interaction.toPosition = toPosition.id;

    interaction.asset = asset.id;
    interaction.amount = amount;
    interaction.amountUsd = ZERO_BD; // TODO

    interaction.save();
}

export function createAbsorbCollateralMarketInteraction(
    market: Market,
    position: Position,
    absorber: Address,
    asset: CollateralAsset,
    amount: BigInt,
    event: ethereum.Event
): void {
    const id = event.transaction.hash.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));
    const interaction = new AbsorbCollateralMarketInteraction(id);

    interaction.hash = event.transaction.hash;
    interaction.logIndex = event.logIndex;
    interaction.blockNumber = event.block.number;
    interaction.timestamp = event.block.timestamp;

    // Not value moved, stayed within the market
    interaction.from = market.id;
    interaction.to = market.id;

    interaction.market = market.id;
    interaction.position = position.id;

    interaction.asset = asset.id;
    interaction.amount = amount;
    interaction.amountUsd = ZERO_BD; // TODO

    interaction.absorber = absorber;

    interaction.save();
}
