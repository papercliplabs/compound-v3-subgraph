import { Address, Bytes, ethereum } from "@graphprotocol/graph-ts";
import { CollateralToken, MarketCollateralBalance, Position, PositionCollateralBalance } from "../../generated/schema";
import { ZERO_BI } from "../common/constants";
import { Comet as CometContract } from "../../generated/templates/Comet/Comet";

////
// Market Collateral Balance
////

export function getOrCreateMarketCollateralBalance(
    collateralToken: CollateralToken,
    event: ethereum.Event
): MarketCollateralBalance {
    const id = collateralToken.market.concat(collateralToken.token).concat(Bytes.fromUTF8("BAL"));
    let collateralBalance = MarketCollateralBalance.load(id);

    if (!collateralBalance) {
        collateralBalance = new MarketCollateralBalance(id);

        collateralBalance.creationBlockNumber = event.block.number;
        collateralBalance.collateralToken = collateralToken.id;
        collateralBalance.market = collateralToken.market;

        updateMarketCollateralBalance(collateralBalance, event);

        collateralBalance.save();
    }

    return collateralBalance;
}

export function updateMarketCollateralBalance(collateralBalance: MarketCollateralBalance, event: ethereum.Event): void {
    const comet = CometContract.bind(Address.fromBytes(collateralBalance.market));
    const collateralToken = CollateralToken.load(collateralBalance.collateralToken)!; // Guaranteed to exist
    const totalsCollateral = comet.totalsCollateral(Address.fromBytes(collateralToken.token));

    collateralBalance.lastUpdateBlockNumber = event.block.number;
    collateralBalance.balance = totalsCollateral.getTotalSupplyAsset();
    collateralBalance.reserves = ZERO_BI;

    // TODO: this is reverting!
    // collateralBalance.reserves = comet.getCollateralReserves(Address.fromBytes(CollateralToken.address));
}

////
// Position Collateral Balance
////

export function getOrCreatePositionCollateralBalance(
    collateralToken: CollateralToken,
    position: Position,
    event: ethereum.Event
): PositionCollateralBalance {
    const id = position.id.concat(collateralToken.token);
    let collateralBalance = PositionCollateralBalance.load(id);

    if (!collateralBalance) {
        collateralBalance = new PositionCollateralBalance(id);

        collateralBalance.creationBlockNumber = event.block.number;
        collateralBalance.collateralToken = collateralToken.id;
        collateralBalance.position = position.id;

        updatePositionCollateralBalance(collateralBalance, event);

        collateralBalance.save();
    }

    return collateralBalance;
}

export function updatePositionCollateralBalance(
    collateralBalance: PositionCollateralBalance,
    event: ethereum.Event
): void {
    const position = Position.load(collateralBalance.position)!; // Guaranteed to exist
    const collateralToken = CollateralToken.load(collateralBalance.collateralToken)!; // Guaranteed to exist
    const comet = CometContract.bind(Address.fromBytes(position.market));

    const userCollateral = comet.userCollateral(
        Address.fromBytes(position.account),
        Address.fromBytes(collateralToken.token)
    );

    collateralBalance.lastUpdateBlockNumber = event.block.number;
    collateralBalance.balance = userCollateral.getBalance();
}
