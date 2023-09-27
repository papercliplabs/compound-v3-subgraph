import {
    Supply as SupplyEvent,
    Withdraw as WithdrawEvent,
    Upgraded as UpgradedEvent,
} from "../../generated/templates/Comet/Comet";
import {
    getOrCreateMarket,
    updateMarketConfiguration,
    updateMarketDerivedAccounting,
    updateMarketIndices,
} from "../mappingHelpers/market";
import { getOrCreatePosition, updatePositionPrincipal } from "../mappingHelpers/position";
import { createSupplyBaseMarketInteraction } from "../mappingHelpers/marketInteraction";

export function handleUpgraded(event: UpgradedEvent): void {
    // Create market if not yet made
    const market = getOrCreateMarket(event.address, event);

    // Trigger the market to update its configuration
    updateMarketConfiguration(market, event);

    market.cometImplementation = event.params.implementation;
    market.save();
}

export function handleSupply(event: SupplyEvent): void {
    ////
    // Inputs
    ////
    const owner = event.params.dst;
    const supplyAmount = event.params.amount;

    const market = getOrCreateMarket(event.address, event);
    const position = getOrCreatePosition(market, owner, event);

    // NEW METHOD
    // 1) updateMarket: a bunch of contract calls
    // 2) updatePosition: update principal + balance (add to position), use contact calls
    // 3) createSupplyMarketInteraction: no principal here

    ////
    // Update interest indices, must come before everything else
    ////
    updateMarketIndices(market, event);

    ////
    // Update position - note that supply can increase only, and borrow can decrease only so we don't need signs
    ////
    const updatePositionRet = updatePositionPrincipal(
        position,
        supplyAmount,
        false,
        market.baseBorrowIndex,
        market.baseSupplyIndex,
        event
    );

    ////
    // Create interaction - supplyPrincipalChange can't be negative here since we added to supply
    ////
    createSupplyBaseMarketInteraction(
        market,
        position,
        supplyAmount,
        updatePositionRet.supplyPrincipalChange,
        updatePositionRet.borrowPrincipalChange,
        owner,
        event
    );

    ////
    // Apply updates
    ////
    market.totalBasePrincipalSupply = market.totalBasePrincipalSupply.plus(updatePositionRet.supplyPrincipalChange);
    market.totalBasePrincipalBorrow = market.totalBasePrincipalBorrow.minus(updatePositionRet.borrowPrincipalChange);

    ////
    // Update accounting
    ////
    updateMarketDerivedAccounting(market, event);

    ////
    // Save
    ////
    position.save();
    market.save();
}

export function handleWithdraw(event: WithdrawEvent): void {}
