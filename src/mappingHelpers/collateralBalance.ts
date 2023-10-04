import { Address, BigDecimal, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
    CollateralToken,
    Market,
    MarketCollateralBalance,
    Position,
    PositionCollateralBalance,
    Token,
} from "../../generated/schema";
import { ZERO_BD, ZERO_BI } from "../common/constants";
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
    const id = collateralToken.market.concat(collateralToken.token).concat(Bytes.fromUTF8("BAL"));
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
    const totalsCollateral = comet.totalsCollateral(Address.fromBytes(collateralToken.token));

    collateralBalance.lastUpdateBlockNumber = event.block.number;
    collateralBalance.balance = totalsCollateral.getTotalSupplyAsset();
    collateralBalance.reserves = ZERO_BI;

    // TODO: this is reverting!
    // collateralBalance.reserves = comet.getCollateralReserves(Address.fromBytes(CollateralToken.address));
}

// Update just the USD value of balance based on newest price and existing balance
export function updateMarketCollateralBalanceUsd(
    collateralBalance: MarketCollateralBalance,
    event: ethereum.Event
): void {
    const collateralToken = CollateralToken.load(collateralBalance.collateralToken)!;
    const collateralTokenToken = getOrCreateToken(Address.fromBytes(collateralToken.token), event);
    const price = getTokenPriceUsd(collateralToken, event);

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

/**
 * Update all USD values of the collateral balances of a market
 * @param market
 * @param event
 * @return total collateral balances in USD
 */
export function updateAllMarketCollateralUsdBalances(market: Market, event: ethereum.Event): void {
    const tokenIds = market.collateralTokens;

    let totalCollateralBalanceUsd = ZERO_BD;
    for (let i = 0; i < tokenIds.length; i++) {
        const token = CollateralToken.load(tokenIds[i])!; // Guaranteed to exist
        const tokenBalance = getOrCreateMarketCollateralBalance(token, event);
        const price = getTokenPriceUsd(token, event);

        // const tokenBalanceUsd =
    }
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
