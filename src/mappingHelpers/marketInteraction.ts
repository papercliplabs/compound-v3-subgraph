import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
    Market,
    Position,
    SupplyBaseMarketInteraction,
    WithdrawBaseMarketInteraction,
    AbsorbDebtMarketInteraction,
    SupplyCollateralMarketInteraction,
    CollateralToken,
    WithdrawCollateralMarketInteraction,
    TransferCollateralMarketInteraction,
    AbsorbCollateralMarketInteraction,
    BuyCollateralMarketInteraction,
    WithdrawReservesMarketInteraction,
} from "../../generated/schema";
import { ZERO_BD } from "../common/constants";
import { getOrCreateMarketConfiguration } from "./market";

export function createSupplyBaseMarketInteraction(
    market: Market,
    position: Position,
    from: Address,
    amount: BigInt,
    event: ethereum.Event
): void {
    const id = event.transaction.hash.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));
    const interaction = new SupplyBaseMarketInteraction(id);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);

    interaction.hash = event.transaction.hash;
    interaction.logIndex = event.logIndex;
    interaction.blockNumber = event.block.number;
    interaction.timestamp = event.block.timestamp;

    interaction.from = from;
    interaction.to = market.id;

    interaction.gasLimit = event.transaction.gasLimit;
    interaction.gasPrice = event.transaction.gasPrice;
    interaction.gasUsed = event.receipt ? event.receipt!.gasUsed : null;

    interaction.market = market.id;
    interaction.position = position.id;

    interaction.asset = marketConfiguration.baseToken;
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
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);

    interaction.hash = event.transaction.hash;
    interaction.logIndex = event.logIndex;
    interaction.blockNumber = event.block.number;
    interaction.timestamp = event.block.timestamp;

    interaction.from = market.id;
    interaction.to = to;

    interaction.gasLimit = event.transaction.gasLimit;
    interaction.gasPrice = event.transaction.gasPrice;
    interaction.gasUsed = event.receipt ? event.receipt!.gasUsed : null;

    interaction.market = market.id;
    interaction.position = position.id;

    interaction.asset = marketConfiguration.baseToken;
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
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);

    interaction.hash = event.transaction.hash;
    interaction.logIndex = event.logIndex;
    interaction.blockNumber = event.block.number;
    interaction.timestamp = event.block.timestamp;

    // There is no actual exchange of value
    // Just internal accounting to have reserves cover bad debt, and protocol takes collateral ownership
    interaction.from = market.id;
    interaction.to = market.id;

    interaction.gasLimit = event.transaction.gasLimit;
    interaction.gasPrice = event.transaction.gasPrice;
    interaction.gasUsed = event.receipt ? event.receipt!.gasUsed : null;

    interaction.market = market.id;
    interaction.position = position.id;

    interaction.asset = marketConfiguration.baseToken;
    interaction.amount = amount;
    interaction.amountUsd = ZERO_BD; // TODO

    interaction.absorber = absorber;

    interaction.save();
}

export function createSupplyCollateralMarketInteraction(
    market: Market,
    position: Position,
    from: Address,
    asset: CollateralToken,
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

    interaction.gasLimit = event.transaction.gasLimit;
    interaction.gasPrice = event.transaction.gasPrice;
    interaction.gasUsed = event.receipt ? event.receipt!.gasUsed : null;

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
    asset: CollateralToken,
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

    interaction.gasLimit = event.transaction.gasLimit;
    interaction.gasPrice = event.transaction.gasPrice;
    interaction.gasUsed = event.receipt ? event.receipt!.gasUsed : null;

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
    asset: CollateralToken,
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

    interaction.gasLimit = event.transaction.gasLimit;
    interaction.gasPrice = event.transaction.gasPrice;
    interaction.gasUsed = event.receipt ? event.receipt!.gasUsed : null;

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
    asset: CollateralToken,
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

    interaction.gasLimit = event.transaction.gasLimit;
    interaction.gasPrice = event.transaction.gasPrice;
    interaction.gasUsed = event.receipt ? event.receipt!.gasUsed : null;

    interaction.market = market.id;
    interaction.position = position.id;

    interaction.asset = asset.id;
    interaction.amount = amount;
    interaction.amountUsd = ZERO_BD; // TODO

    interaction.absorber = absorber;

    interaction.save();
}

export function createBuyCollateralMarketInteraction(
    market: Market,
    buyer: Address,
    asset: CollateralToken,
    collateralAmount: BigInt,
    baseAmount: BigInt,
    event: ethereum.Event
): void {
    const id = event.transaction.hash.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));
    const interaction = new BuyCollateralMarketInteraction(id);

    interaction.hash = event.transaction.hash;
    interaction.logIndex = event.logIndex;
    interaction.blockNumber = event.block.number;
    interaction.timestamp = event.block.timestamp;

    // Not value moved, stayed within the market
    interaction.from = market.id;
    interaction.to = buyer;

    interaction.gasLimit = event.transaction.gasLimit;
    interaction.gasPrice = event.transaction.gasPrice;
    interaction.gasUsed = event.receipt ? event.receipt!.gasUsed : null;

    interaction.market = market.id;

    interaction.asset = asset.id;
    interaction.collateralAmount = collateralAmount;
    interaction.baseAmount = baseAmount;
    interaction.amountUsd = ZERO_BD; // TODO

    interaction.save();
}

export function createWithdrawReservesMarketInteraction(
    market: Market,
    to: Address,
    amount: BigInt,
    event: ethereum.Event
): void {
    const id = event.transaction.hash.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));
    const interaction = new WithdrawReservesMarketInteraction(id);

    interaction.hash = event.transaction.hash;
    interaction.logIndex = event.logIndex;
    interaction.blockNumber = event.block.number;
    interaction.timestamp = event.block.timestamp;

    // Not value moved, stayed within the market
    interaction.from = market.id;
    interaction.to = to;

    interaction.gasLimit = event.transaction.gasLimit;
    interaction.gasPrice = event.transaction.gasPrice;
    interaction.gasUsed = event.receipt ? event.receipt!.gasUsed : null;

    interaction.market = market.id;

    interaction.amount = amount;
    interaction.amountUsd = ZERO_BD; // TODO

    interaction.save();
}
