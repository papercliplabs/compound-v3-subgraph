import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { Market, SupplyBaseMarketInteraction, Position } from "../../generated/schema";
import { getOrCreateMarket } from "./market";
import { ZERO_BD, ZERO_BI } from "../common/constants";

export function createSupplyBaseMarketInteraction(
    market: Market,
    position: Position,
    supplyAmount: BigInt,
    supplyPrincipalIncrease: BigInt,
    borrowPrincipalDecrease: BigInt,
    dst: Address,
    event: ethereum.Event
): void {
    const id = event.transaction.hash.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));
    const supplyBase = new SupplyBaseMarketInteraction(id);

    supplyBase.hash = event.transaction.hash;
    supplyBase.logIndex = event.logIndex;
    supplyBase.blockNumber = event.block.number;
    supplyBase.timestamp = event.block.timestamp;
    supplyBase.from = event.transaction.from;
    supplyBase.to = market.id;
    supplyBase.dst = dst;

    supplyBase.market = market.id;
    supplyBase.position = position.id;

    supplyBase.asset = market.baseAsset;
    supplyBase.amount = supplyAmount;
    supplyBase.supplyPrincipalIncrease = supplyPrincipalIncrease;
    supplyBase.borrowPrincipalDecrease = borrowPrincipalDecrease;
    supplyBase.amountUsd = ZERO_BD; // TODO

    supplyBase.save();
}
