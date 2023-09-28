import { Address, ethereum } from "@graphprotocol/graph-ts";
import { Position, Market } from "../../generated/schema";
import { ZERO_BI } from "../common/constants";
import { getOrCreateMarket } from "./market";
import { presentValue } from "../common/utils";
import { Comet as CometContract } from "../../generated/templates/Comet/Comet";

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
        position.baseBalance = ZERO_BI;
        position.baseTrackingIndex = ZERO_BI;
        position.baseTrackingAccrued = ZERO_BI;

        position.save();
    }

    return position;
}

export function updatePosition(position: Position, event: ethereum.Event): void {
    const market = getOrCreateMarket(Address.fromBytes(position.market), event);
    const comet = CometContract.bind(Address.fromBytes(market.id));

    const userBasic = comet.userBasic(Address.fromBytes(position.owner));

    position.lastUpdatedBlockNumber = event.block.number;
    position.basePrincipal = userBasic.getPrincipal();
    position.baseBalance = presentValue(
        position.basePrincipal,
        position.basePrincipal.lt(ZERO_BI) ? market.baseBorrowIndex : market.baseSupplyIndex
    );
    position.baseTrackingIndex = userBasic.getBaseTrackingIndex();
    position.baseTrackingAccrued = userBasic.getBaseTrackingAccrued();
}
