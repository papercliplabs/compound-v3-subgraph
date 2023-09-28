import {
    Upgraded as UpgradedEvent,
    Supply as SupplyEvent,
    Withdraw as WithdrawEvent,
    AbsorbDebt as AbsorbDebtEvent,
    SupplyCollateral as SupplyCollateralEvent,
    WithdrawCollateral as WithdrawCollateralEvent,
    TransferCollateral as TransferCollateralEvent,
    AbsorbCollateral as AbsorbCollateralEvent,
} from "../../generated/templates/Comet/Comet";
import { getOrCreateMarket, updateMarketAccounting, updateMarketConfiguration } from "../mappingHelpers/market";
import { getOrCreatePosition, updatePosition } from "../mappingHelpers/position";
import {
    createSupplyBaseMarketInteraction,
    createWithdrawBaseMarketInteraction,
    createAbsorbDebtMarketInteraction,
    createSupplyCollateralMarketInteraction,
    createWithdrawCollateralMarketInteraction,
    createTransferCollateralMarketInteraction,
    createAbsorbCollateralMarketInteraction,
} from "../mappingHelpers/marketInteraction";
import {
    getOrCreateCollateralAsset,
    getOrCreateMarketCollateralBalance,
    getOrCreatePositionCollateralBalance,
    updateMarketCollateralBalance,
    updatePositionCollateralBalance,
} from "../mappingHelpers/collateral";

export function handleUpgraded(event: UpgradedEvent): void {
    // Create market if not yet made
    const market = getOrCreateMarket(event.address, event);

    // Trigger the market to update its configuration
    updateMarketConfiguration(market, event);

    // Cannot read from contract since need to read memory slot since only owner can read proxy
    market.cometImplementation = event.params.implementation;
    market.save();
}

export function handleSupply(event: SupplyEvent): void {
    const owner = event.params.dst;
    const amount = event.params.amount;
    const from = event.params.from;

    const market = getOrCreateMarket(event.address, event);
    const position = getOrCreatePosition(market, owner, event);

    updateMarketAccounting(market, event);
    updatePosition(position, event);
    createSupplyBaseMarketInteraction(market, position, from, amount, event);

    position.save();
    market.save();
}

export function handleWithdraw(event: WithdrawEvent): void {
    const owner = event.params.src;
    const amount = event.params.amount;

    const market = getOrCreateMarket(event.address, event);
    const position = getOrCreatePosition(market, owner, event);

    updateMarketAccounting(market, event);
    updatePosition(position, event);
    createWithdrawBaseMarketInteraction(market, position, event.params.src, amount, event);

    position.save();
    market.save();
}

export function handleAbsorbDebt(event: AbsorbDebtEvent): void {
    const owner = event.params.borrower;
    const amount = event.params.basePaidOut;
    const absorber = event.params.absorber;

    const market = getOrCreateMarket(event.address, event);
    const position = getOrCreatePosition(market, owner, event);

    updateMarketAccounting(market, event);
    updatePosition(position, event);
    createAbsorbDebtMarketInteraction(market, position, absorber, amount, event);

    position.save();
    market.save();
}

export function handleSupplyCollateral(event: SupplyCollateralEvent): void {
    const owner = event.params.dst;
    const amount = event.params.amount;
    const from = event.params.from;
    const assetAddress = event.params.asset;

    const market = getOrCreateMarket(event.address, event);
    const position = getOrCreatePosition(market, owner, event);
    const collateralAsset = getOrCreateCollateralAsset(market, assetAddress, event);

    const marketCollateralBalance = getOrCreateMarketCollateralBalance(collateralAsset, event);
    const positionCollateralBalance = getOrCreatePositionCollateralBalance(collateralAsset, position, event);

    updateMarketCollateralBalance(marketCollateralBalance, amount, event);
    updatePositionCollateralBalance(positionCollateralBalance, amount, event);

    createSupplyCollateralMarketInteraction(market, position, from, collateralAsset, amount, event);

    marketCollateralBalance.save();
    positionCollateralBalance.save();
}

export function handleWithdrawCollateral(event: WithdrawCollateralEvent): void {
    const owner = event.params.src;
    const amount = event.params.amount.neg();
    const to = event.params.to;
    const assetAddress = event.params.asset;

    const market = getOrCreateMarket(event.address, event);
    const position = getOrCreatePosition(market, owner, event);
    const collateralAsset = getOrCreateCollateralAsset(market, assetAddress, event);

    const marketCollateralBalance = getOrCreateMarketCollateralBalance(collateralAsset, event);
    const positionCollateralBalance = getOrCreatePositionCollateralBalance(collateralAsset, position, event);

    updateMarketCollateralBalance(marketCollateralBalance, amount, event);
    updatePositionCollateralBalance(positionCollateralBalance, amount, event);

    createWithdrawCollateralMarketInteraction(market, position, to, collateralAsset, amount.neg(), event);

    marketCollateralBalance.save();
    positionCollateralBalance.save();
}

export function handleTransferCollateral(event: TransferCollateralEvent): void {
    const from = event.params.from;
    const to = event.params.to;
    const assetAddress = event.params.asset;
    const amount = event.params.amount;

    const market = getOrCreateMarket(event.address, event);
    const collateralAsset = getOrCreateCollateralAsset(market, assetAddress, event);

    const fromPosition = getOrCreatePosition(market, from, event);
    const toPosition = getOrCreatePosition(market, to, event);

    const fromPositionCollateralBalance = getOrCreatePositionCollateralBalance(collateralAsset, fromPosition, event);
    const toPositionCollateralBalance = getOrCreatePositionCollateralBalance(collateralAsset, toPosition, event);

    updatePositionCollateralBalance(fromPositionCollateralBalance, amount.neg(), event);
    updatePositionCollateralBalance(toPositionCollateralBalance, amount, event);

    createTransferCollateralMarketInteraction(market, fromPosition, toPosition, collateralAsset, amount, event);

    fromPositionCollateralBalance.save();
    toPositionCollateralBalance.save();
}

export function handleAbsorbCollateral(event: AbsorbCollateralEvent): void {
    const absorber = event.params.absorber;
    const owner = event.params.borrower;
    const assetAddress = event.params.asset;
    const amount = event.params.collateralAbsorbed;

    const market = getOrCreateMarket(event.address, event);
    const collateralAsset = getOrCreateCollateralAsset(market, assetAddress, event);
    const position = getOrCreatePosition(market, owner, event);

    const marketCollateralBalance = getOrCreateMarketCollateralBalance(collateralAsset, event);
    const positionCollateralBalance = getOrCreatePositionCollateralBalance(collateralAsset, position, event);

    updateMarketCollateralBalance(marketCollateralBalance, amount.neg(), event);
    updatePositionCollateralBalance(positionCollateralBalance, amount.neg(), event);

    createAbsorbCollateralMarketInteraction(market, position, absorber, collateralAsset, amount, event);

    positionCollateralBalance.save();
    marketCollateralBalance.save();
}
