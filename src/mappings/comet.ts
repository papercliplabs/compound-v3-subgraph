import {
    Upgraded as UpgradedEvent,
    Supply as SupplyEvent,
    Withdraw as WithdrawEvent,
    AbsorbDebt as AbsorbDebtEvent,
    SupplyCollateral as SupplyCollateralEvent,
    WithdrawCollateral as WithdrawCollateralEvent,
    TransferCollateral as TransferCollateralEvent,
    AbsorbCollateral as AbsorbCollateralEvent,
    BuyCollateral as BuyCollateralEvent,
    WithdrawReserves as WithdrawReservesEvent,
} from "../../generated/templates/Comet/Comet";
import { getOrCreateMarket, updateMarketAccounting, updateMarketConfiguration } from "../mappingHelpers/market";
import { getOrCreatePosition, updatePosition } from "../mappingHelpers/position";
import { getOrCreateAccount } from "../mappingHelpers/account";
import {
    createSupplyBaseMarketInteraction,
    createWithdrawBaseMarketInteraction,
    createAbsorbDebtMarketInteraction,
    createSupplyCollateralMarketInteraction,
    createWithdrawCollateralMarketInteraction,
    createTransferCollateralMarketInteraction,
    createAbsorbCollateralMarketInteraction,
    createBuyCollateralMarketInteraction,
    createWithdrawReservesMarketInteraction,
} from "../mappingHelpers/marketInteraction";
import {
    getOrCreateCollateralAsset,
    getOrCreateMarketCollateralBalance,
    getOrCreatePositionCollateralBalance,
    updateMarketCollateral,
    updatePositionCollateral,
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
    const ownerAddress = event.params.dst;
    const amount = event.params.amount;
    const from = event.params.from;

    const market = getOrCreateMarket(event.address, event);
    const account = getOrCreateAccount(ownerAddress, event);
    const position = getOrCreatePosition(market, account, event);

    updateMarketAccounting(market, event);
    updatePosition(position, event);
    createSupplyBaseMarketInteraction(market, position, from, amount, event);

    position.save();
    market.save();
}

export function handleWithdraw(event: WithdrawEvent): void {
    const ownerAddress = event.params.src;
    const amount = event.params.amount;

    const market = getOrCreateMarket(event.address, event);
    const account = getOrCreateAccount(ownerAddress, event);
    const position = getOrCreatePosition(market, account, event);

    updateMarketAccounting(market, event);
    updatePosition(position, event);
    createWithdrawBaseMarketInteraction(market, position, event.params.src, amount, event);

    position.save();
    market.save();
}

export function handleAbsorbDebt(event: AbsorbDebtEvent): void {
    const ownerAddress = event.params.borrower;
    const amount = event.params.basePaidOut;
    const absorber = event.params.absorber;

    const market = getOrCreateMarket(event.address, event);
    const account = getOrCreateAccount(ownerAddress, event);
    const position = getOrCreatePosition(market, account, event);

    updateMarketAccounting(market, event);
    updatePosition(position, event);
    createAbsorbDebtMarketInteraction(market, position, absorber, amount, event);

    position.save();
    market.save();
}

export function handleSupplyCollateral(event: SupplyCollateralEvent): void {
    const ownerAddress = event.params.dst;
    const amount = event.params.amount;
    const from = event.params.from;
    const assetAddress = event.params.asset;

    const market = getOrCreateMarket(event.address, event);
    const account = getOrCreateAccount(ownerAddress, event);
    const position = getOrCreatePosition(market, account, event);
    const collateralAsset = getOrCreateCollateralAsset(market, assetAddress, event);

    const marketCollateralBalance = getOrCreateMarketCollateralBalance(collateralAsset, event);
    const positionCollateralBalance = getOrCreatePositionCollateralBalance(collateralAsset, position, event);

    updateMarketCollateral(market, collateralAsset, marketCollateralBalance, event);
    updatePositionCollateral(market, collateralAsset, position, positionCollateralBalance, event);

    createSupplyCollateralMarketInteraction(market, position, from, collateralAsset, amount, event);

    marketCollateralBalance.save();
    positionCollateralBalance.save();
}

export function handleWithdrawCollateral(event: WithdrawCollateralEvent): void {
    const ownerAddress = event.params.src;
    const amount = event.params.amount.neg();
    const to = event.params.to;
    const assetAddress = event.params.asset;

    const market = getOrCreateMarket(event.address, event);
    const account = getOrCreateAccount(ownerAddress, event);
    const position = getOrCreatePosition(market, account, event);
    const collateralAsset = getOrCreateCollateralAsset(market, assetAddress, event);

    const marketCollateralBalance = getOrCreateMarketCollateralBalance(collateralAsset, event);
    const positionCollateralBalance = getOrCreatePositionCollateralBalance(collateralAsset, position, event);

    updateMarketCollateral(market, collateralAsset, marketCollateralBalance, event);
    updatePositionCollateral(market, collateralAsset, position, positionCollateralBalance, event);

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
    const fromAccount = getOrCreateAccount(from, event);
    const toAccount = getOrCreateAccount(to, event);
    const collateralAsset = getOrCreateCollateralAsset(market, assetAddress, event);

    const fromPosition = getOrCreatePosition(market, fromAccount, event);
    const toPosition = getOrCreatePosition(market, toAccount, event);

    const fromPositionCollateralBalance = getOrCreatePositionCollateralBalance(collateralAsset, fromPosition, event);
    const toPositionCollateralBalance = getOrCreatePositionCollateralBalance(collateralAsset, toPosition, event);

    updatePositionCollateral(market, collateralAsset, fromPosition, fromPositionCollateralBalance, event);
    updatePositionCollateral(market, collateralAsset, toPosition, toPositionCollateralBalance, event);

    createTransferCollateralMarketInteraction(market, fromPosition, toPosition, collateralAsset, amount, event);

    fromPositionCollateralBalance.save();
    toPositionCollateralBalance.save();
}

export function handleAbsorbCollateral(event: AbsorbCollateralEvent): void {
    const absorber = event.params.absorber;
    const ownerAddress = event.params.borrower;
    const assetAddress = event.params.asset;
    const amount = event.params.collateralAbsorbed;

    const market = getOrCreateMarket(event.address, event);
    const collateralAsset = getOrCreateCollateralAsset(market, assetAddress, event);
    const account = getOrCreateAccount(ownerAddress, event);
    const position = getOrCreatePosition(market, account, event);

    const marketCollateralBalance = getOrCreateMarketCollateralBalance(collateralAsset, event);
    const positionCollateralBalance = getOrCreatePositionCollateralBalance(collateralAsset, position, event);

    updateMarketCollateral(market, collateralAsset, marketCollateralBalance, event);
    updatePositionCollateral(market, collateralAsset, position, positionCollateralBalance, event);

    createAbsorbCollateralMarketInteraction(market, position, absorber, collateralAsset, amount, event);

    positionCollateralBalance.save();
    marketCollateralBalance.save();
}

export function handleBuyCollateral(event: BuyCollateralEvent): void {
    const assetAddress = event.params.asset;
    const buyer = event.params.buyer;
    const collateralAmount = event.params.collateralAmount;
    const baseAmount = event.params.baseAmount;

    const market = getOrCreateMarket(event.address, event);
    const collateralAsset = getOrCreateCollateralAsset(market, assetAddress, event);

    const marketCollateralBalance = getOrCreateMarketCollateralBalance(collateralAsset, event);

    updateMarketCollateral(market, collateralAsset, marketCollateralBalance, event);
    createBuyCollateralMarketInteraction(market, buyer, collateralAsset, collateralAmount, baseAmount, event);

    marketCollateralBalance.save();
}

export function handleWithdrawReserves(event: WithdrawReservesEvent): void {
    const market = getOrCreateMarket(event.address, event);
    const to = event.params.to;
    const amount = event.params.amount;

    updateMarketAccounting(market, event);
    createWithdrawReservesMarketInteraction(market, to, amount, event);

    market.save();
}
