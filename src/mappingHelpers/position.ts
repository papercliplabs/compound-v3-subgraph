import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { Position, Market } from "../../generated/schema";
import { ZERO_BI } from "../common/constants";
import { getOrCreateMarket } from "./market";
import { bigIntSignedPlus, presentValue, principalValue } from "../common/utils";

export function getOrCreatePosition(market: Market, owner: Address, event: ethereum.Event): Position {
    const id = market.id.concat(owner);
    let position = Position.load(id);

    if (!position) {
        position = new Position(id);

        position.creationBlockNumber = event.block.number;
        position.lastUpdatedBlockNumber = event.block.number;
        position.market = market.id;
        position.owner = owner;
        position.basePrincipal = ZERO_BI;
        position.basePrincipalIsNegative = false;

        position.save();
    }

    return position;
}

export class UpdatePositionPrincipalRet {
    supplyPrincipalChange: BigInt;
    supplyPrincipalChangeIsNeg: boolean;
    borrowPrincipalChange: BigInt;
    borrowPrincipalChangeIsNeg: boolean;
}

/**
 * Update a positions principal by added a present value change to it
 * @param position position to update
 * @param presentValueChange present value to add to the principal
 * @param presentValueChangeIsNegative if the present value to add is negative
 * @param borrowIndex markets borrow index
 * @param supplyIndex markets supply index
 * @param event
 * @return
 *  borrowPrincipalChange: how much the borrow side of the principal changed
 *  borrowPrincipalChangeIsNeg: positive means increased borrow, negative means decreased
 *  supplyPrincipalChange: how much the supply side of the principal changed
 *  supplyPrincipalChangeIsNeg: positive means increased supply, negative means decreased
 */
export function updatePositionPrincipal(
    position: Position,
    presentValueChange: BigInt,
    presentValueChangeIsNegative: boolean,
    borrowIndex: BigInt,
    supplyIndex: BigInt,
    event: ethereum.Event
): UpdatePositionPrincipalRet {
    const oldPrincipal = position.basePrincipal;
    const oldPrincipalIsNeg = position.basePrincipalIsNegative;
    const presentValueOfOldPrincipal = presentValue(oldPrincipal, oldPrincipalIsNeg ? borrowIndex : supplyIndex);

    const bigIntSignedPlusRet = bigIntSignedPlus(
        presentValueOfOldPrincipal,
        oldPrincipalIsNeg,
        presentValueChange,
        presentValueChangeIsNegative
    );
    const newPresentValue = bigIntSignedPlusRet.sum;
    const newPrincipalIsNeg = bigIntSignedPlusRet.sumIsNeg;

    const newPrincipal = principalValue(newPresentValue, newPrincipalIsNeg ? borrowIndex : supplyIndex);

    position.lastUpdatedBlockNumber = event.block.number;
    position.basePrincipal = newPrincipal;
    position.basePrincipalIsNegative = newPrincipalIsNeg;

    // Compute changes
    const oldSupply = oldPrincipalIsNeg ? ZERO_BI : oldPrincipal;
    const newSupply = newPrincipalIsNeg ? ZERO_BI : newPrincipal;
    const supplyPrincipalChangeIsNeg = newSupply.lt(oldSupply);
    const supplyPrincipalChange = supplyPrincipalChangeIsNeg ? oldSupply.minus(newSupply) : newSupply.minus(oldSupply);

    const oldBorrow = oldPrincipalIsNeg ? oldPrincipal : ZERO_BI;
    const newBorrow = newPrincipalIsNeg ? newPrincipal : ZERO_BI;
    const borrowPrincipalChangeIsNeg = newBorrow.lt(oldBorrow);
    const borrowPrincipalChange = borrowPrincipalChangeIsNeg ? oldBorrow.minus(newBorrow) : newBorrow.minus(oldBorrow);

    return { supplyPrincipalChange, supplyPrincipalChangeIsNeg, borrowPrincipalChange, borrowPrincipalChangeIsNeg };
}
