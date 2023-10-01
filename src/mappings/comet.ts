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
    getOrCreateMarketCollateralBalance,
    getOrCreatePositionCollateralBalance,
    updateMarketCollateralBalance,
    updatePositionCollateralBalance,
} from "../mappingHelpers/collateralBalance";
import { getOrCreateCollateralToken, getOrCreateToken } from "../mappingHelpers/token";
import { updateProtocolUsageMetrics } from "../mappingHelpers/protocol";
import { TransactionType } from "../common/constants";

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
    updateProtocolUsageMetrics(account, TransactionType.SUPPLY_BASE, event);

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
    updateProtocolUsageMetrics(account, TransactionType.WITHDRAW_BASE, event);

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
    updateProtocolUsageMetrics(account, TransactionType.LIQUIDATION, event);

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
    const token = getOrCreateToken(assetAddress, event);
    const collateralToken = getOrCreateCollateralToken(market, token, event);

    const marketCollateralBalance = getOrCreateMarketCollateralBalance(collateralToken, event);
    const positionCollateralBalance = getOrCreatePositionCollateralBalance(collateralToken, position, event);

    updateMarketCollateralBalance(marketCollateralBalance, event);
    updatePositionCollateralBalance(positionCollateralBalance, event);

    createSupplyCollateralMarketInteraction(market, position, from, collateralToken, amount, event);
    updateProtocolUsageMetrics(account, TransactionType.SUPPLY_COLLATERAL, event);

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
    const token = getOrCreateToken(assetAddress, event);
    const collateralToken = getOrCreateCollateralToken(market, token, event);

    const marketCollateralBalance = getOrCreateMarketCollateralBalance(collateralToken, event);
    const positionCollateralBalance = getOrCreatePositionCollateralBalance(collateralToken, position, event);

    updateMarketCollateralBalance(marketCollateralBalance, event);
    updatePositionCollateralBalance(positionCollateralBalance, event);

    createWithdrawCollateralMarketInteraction(market, position, to, collateralToken, amount.neg(), event);
    updateProtocolUsageMetrics(account, TransactionType.WITHDRAW_COLLATERAL, event);

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
    const token = getOrCreateToken(assetAddress, event);
    const collateralToken = getOrCreateCollateralToken(market, token, event);
    const fromPosition = getOrCreatePosition(market, fromAccount, event);
    const toPosition = getOrCreatePosition(market, toAccount, event);

    const fromPositionCollateralBalance = getOrCreatePositionCollateralBalance(collateralToken, fromPosition, event);
    const toPositionCollateralBalance = getOrCreatePositionCollateralBalance(collateralToken, toPosition, event);

    updatePositionCollateralBalance(fromPositionCollateralBalance, event);
    updatePositionCollateralBalance(toPositionCollateralBalance, event);

    createTransferCollateralMarketInteraction(market, fromPosition, toPosition, collateralToken, amount, event);
    updateProtocolUsageMetrics(fromAccount, TransactionType.TRANSFER_COLLATERAL, event);

    fromPositionCollateralBalance.save();
    toPositionCollateralBalance.save();
}

export function handleAbsorbCollateral(event: AbsorbCollateralEvent): void {
    const absorber = event.params.absorber;
    const ownerAddress = event.params.borrower;
    const assetAddress = event.params.asset;
    const amount = event.params.collateralAbsorbed;

    const market = getOrCreateMarket(event.address, event);
    const account = getOrCreateAccount(ownerAddress, event);
    const position = getOrCreatePosition(market, account, event);
    const token = getOrCreateToken(assetAddress, event);
    const collateralToken = getOrCreateCollateralToken(market, token, event);

    const marketCollateralBalance = getOrCreateMarketCollateralBalance(collateralToken, event);
    const positionCollateralBalance = getOrCreatePositionCollateralBalance(collateralToken, position, event);

    updateMarketCollateralBalance(marketCollateralBalance, event);
    updatePositionCollateralBalance(positionCollateralBalance, event);

    createAbsorbCollateralMarketInteraction(market, position, absorber, collateralToken, amount, event);

    positionCollateralBalance.save();
    marketCollateralBalance.save();
}

export function handleBuyCollateral(event: BuyCollateralEvent): void {
    const assetAddress = event.params.asset;
    const buyer = event.params.buyer;
    const collateralAmount = event.params.collateralAmount;
    const baseAmount = event.params.baseAmount;

    const market = getOrCreateMarket(event.address, event);
    const token = getOrCreateToken(assetAddress, event);
    const collateralToken = getOrCreateCollateralToken(market, token, event);

    const marketCollateralBalance = getOrCreateMarketCollateralBalance(collateralToken, event);

    updateMarketCollateralBalance(marketCollateralBalance, event);
    createBuyCollateralMarketInteraction(market, buyer, collateralToken, collateralAmount, baseAmount, event);

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
