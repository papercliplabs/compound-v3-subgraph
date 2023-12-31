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
    Transfer as TransferEvent,
} from "../../generated/templates/Comet/Comet";
import {
    getOrCreateMarket,
    getOrCreateMarketAccounting,
    getOrCreateMarketConfiguration,
    updateMarketAccounting,
    updateMarketConfiguration,
} from "../mappingHelpers/market";
import {
    getOrCreatePosition,
    getOrCreatePositionAccounting,
    updatePositionAccounting,
} from "../mappingHelpers/position";
import { getOrCreateAccount } from "../mappingHelpers/account";
import {
    createSupplyBaseInteraction,
    createWithdrawBaseInteraction,
    createAbsorbDebtInteraction,
    createSupplyCollateralInteraction,
    createWithdrawCollateralInteraction,
    createTransferCollateralInteraction,
    createAbsorbCollateralInteraction,
    createBuyCollateralInteraction,
    createWithdrawReservesInteraction,
} from "../mappingHelpers/interaction";
import {
    getOrCreateMarketCollateralBalance,
    getOrCreatePositionCollateralBalance,
    updateMarketCollateralBalance,
    updatePositionCollateralBalance,
} from "../mappingHelpers/collateralBalance";
import { getOrCreateCollateralToken, getOrCreateToken } from "../mappingHelpers/token";
import { InteractionType } from "../common/constants";
import { updateUsageMetrics } from "../mappingHelpers/usage";

export function handleUpgraded(event: UpgradedEvent): void {
    // Create market if not yet made
    const market = getOrCreateMarket(event.address, event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);

    // Trigger the market to update its configuration
    updateMarketConfiguration(market, marketConfiguration, event);

    // Cannot read from contract since need to read memory slot since only owner can read proxy
    marketConfiguration.cometImplementation = event.params.implementation;
    marketConfiguration.save();
}

export function handleSupply(event: SupplyEvent): void {
    const ownerAddress = event.params.dst;
    const amount = event.params.amount;
    const from = event.params.from;

    const market = getOrCreateMarket(event.address, event);
    const marketAccounting = getOrCreateMarketAccounting(market, event);
    const account = getOrCreateAccount(ownerAddress, event);
    const position = getOrCreatePosition(market, account, event);
    const positionAccounting = getOrCreatePositionAccounting(position, event);

    updateMarketAccounting(market, marketAccounting, event);
    updatePositionAccounting(position, positionAccounting, event);

    createSupplyBaseInteraction(market, position, from, amount, event);
    updateUsageMetrics(account, market, InteractionType.SUPPLY_BASE, event);

    marketAccounting.save();
    positionAccounting.save();
}

export function handleWithdraw(event: WithdrawEvent): void {
    const ownerAddress = event.params.src;
    const amount = event.params.amount;
    const destination = event.params.to;

    const market = getOrCreateMarket(event.address, event);
    const marketAccounting = getOrCreateMarketAccounting(market, event);
    const account = getOrCreateAccount(ownerAddress, event);
    const position = getOrCreatePosition(market, account, event);
    const positionAccounting = getOrCreatePositionAccounting(position, event);

    updateMarketAccounting(market, marketAccounting, event);
    updatePositionAccounting(position, positionAccounting, event);

    createWithdrawBaseInteraction(market, position, destination, amount, event);
    updateUsageMetrics(account, market, InteractionType.WITHDRAW_BASE, event);

    marketAccounting.save();
    positionAccounting.save();
}

export function handleAbsorbDebt(event: AbsorbDebtEvent): void {
    const ownerAddress = event.params.borrower;
    const amount = event.params.basePaidOut;
    const absorber = event.params.absorber;

    const market = getOrCreateMarket(event.address, event);
    const marketAccounting = getOrCreateMarketAccounting(market, event);
    const account = getOrCreateAccount(ownerAddress, event);
    const position = getOrCreatePosition(market, account, event);
    const positionAccounting = getOrCreatePositionAccounting(position, event);

    updateMarketAccounting(market, marketAccounting, event);
    updatePositionAccounting(position, positionAccounting, event);

    createAbsorbDebtInteraction(market, position, absorber, amount, event);
    updateUsageMetrics(account, market, InteractionType.LIQUIDATION, event);

    marketAccounting.save();
    positionAccounting.save();
}

export function handleSupplyCollateral(event: SupplyCollateralEvent): void {
    const ownerAddress = event.params.dst;
    const amount = event.params.amount;
    const supplier = event.params.from;
    const assetAddress = event.params.asset;

    const market = getOrCreateMarket(event.address, event);
    const marketAccounting = getOrCreateMarketAccounting(market, event);
    const account = getOrCreateAccount(ownerAddress, event);
    const position = getOrCreatePosition(market, account, event);
    const positionAccounting = getOrCreatePositionAccounting(position, event);
    const token = getOrCreateToken(assetAddress, event);
    const collateralToken = getOrCreateCollateralToken(market, token, event);

    const marketCollateralBalance = getOrCreateMarketCollateralBalance(collateralToken, event);
    const positionCollateralBalance = getOrCreatePositionCollateralBalance(collateralToken, position, event);

    updateMarketCollateralBalance(marketCollateralBalance, event);
    updatePositionCollateralBalance(position, positionCollateralBalance, event);

    updateMarketAccounting(market, marketAccounting, event);
    updatePositionAccounting(position, positionAccounting, event);

    createSupplyCollateralInteraction(market, position, supplier, collateralToken, amount, event);
    updateUsageMetrics(account, market, InteractionType.SUPPLY_COLLATERAL, event);

    marketCollateralBalance.save();
    positionCollateralBalance.save();
    marketAccounting.save();
    positionAccounting.save();
}

export function handleWithdrawCollateral(event: WithdrawCollateralEvent): void {
    const ownerAddress = event.params.src;
    const amount = event.params.amount.neg();
    const destination = event.params.to;
    const assetAddress = event.params.asset;

    const market = getOrCreateMarket(event.address, event);
    const marketAccounting = getOrCreateMarketAccounting(market, event);
    const account = getOrCreateAccount(ownerAddress, event);
    const position = getOrCreatePosition(market, account, event);
    const positionAccounting = getOrCreatePositionAccounting(position, event);
    const token = getOrCreateToken(assetAddress, event);
    const collateralToken = getOrCreateCollateralToken(market, token, event);

    const marketCollateralBalance = getOrCreateMarketCollateralBalance(collateralToken, event);
    const positionCollateralBalance = getOrCreatePositionCollateralBalance(collateralToken, position, event);

    updateMarketCollateralBalance(marketCollateralBalance, event);
    updatePositionCollateralBalance(position, positionCollateralBalance, event);

    updateMarketAccounting(market, marketAccounting, event);
    updatePositionAccounting(position, positionAccounting, event);

    createWithdrawCollateralInteraction(market, position, destination, collateralToken, amount.neg(), event);
    updateUsageMetrics(account, market, InteractionType.WITHDRAW_COLLATERAL, event);

    marketCollateralBalance.save();
    positionCollateralBalance.save();
    marketAccounting.save();
    positionAccounting.save();
}

export function handleTransferCollateral(event: TransferCollateralEvent): void {
    const from = event.params.from;
    const to = event.params.to;
    const assetAddress = event.params.asset;
    const amount = event.params.amount;

    const market = getOrCreateMarket(event.address, event);
    const marketAccounting = getOrCreateMarketAccounting(market, event);
    const fromAccount = getOrCreateAccount(from, event);
    const toAccount = getOrCreateAccount(to, event);
    const token = getOrCreateToken(assetAddress, event);
    const collateralToken = getOrCreateCollateralToken(market, token, event);
    const fromPosition = getOrCreatePosition(market, fromAccount, event);
    const fromPositionAccounting = getOrCreatePositionAccounting(fromPosition, event);
    const toPosition = getOrCreatePosition(market, toAccount, event);
    const toPositionAccounting = getOrCreatePositionAccounting(toPosition, event);

    const fromPositionCollateralBalance = getOrCreatePositionCollateralBalance(collateralToken, fromPosition, event);
    const toPositionCollateralBalance = getOrCreatePositionCollateralBalance(collateralToken, toPosition, event);

    updatePositionCollateralBalance(fromPosition, fromPositionCollateralBalance, event);
    updatePositionCollateralBalance(toPosition, toPositionCollateralBalance, event);

    updateMarketAccounting(market, marketAccounting, event);
    updatePositionAccounting(fromPosition, fromPositionAccounting, event);
    updatePositionAccounting(toPosition, toPositionAccounting, event);

    createTransferCollateralInteraction(market, fromPosition, toPosition, collateralToken, amount, event);
    updateUsageMetrics(fromAccount, market, InteractionType.TRANSFER_COLLATERAL, event);

    fromPositionCollateralBalance.save();
    toPositionCollateralBalance.save();
    marketAccounting.save();
    fromPositionAccounting.save();
    toPositionAccounting.save();
}

export function handleAbsorbCollateral(event: AbsorbCollateralEvent): void {
    const absorber = event.params.absorber;
    const ownerAddress = event.params.borrower;
    const assetAddress = event.params.asset;
    const amount = event.params.collateralAbsorbed;

    const market = getOrCreateMarket(event.address, event);
    const marketAccounting = getOrCreateMarketAccounting(market, event);
    const account = getOrCreateAccount(ownerAddress, event);
    const position = getOrCreatePosition(market, account, event);
    const positionAccounting = getOrCreatePositionAccounting(position, event);
    const token = getOrCreateToken(assetAddress, event);
    const collateralToken = getOrCreateCollateralToken(market, token, event);

    const marketCollateralBalance = getOrCreateMarketCollateralBalance(collateralToken, event);
    const positionCollateralBalance = getOrCreatePositionCollateralBalance(collateralToken, position, event);

    updateMarketCollateralBalance(marketCollateralBalance, event);
    updatePositionCollateralBalance(position, positionCollateralBalance, event);

    updateMarketAccounting(market, marketAccounting, event);
    updatePositionAccounting(position, positionAccounting, event);

    createAbsorbCollateralInteraction(market, position, absorber, collateralToken, amount, event);

    marketCollateralBalance.save();
    positionCollateralBalance.save();
    marketAccounting.save();
    positionAccounting.save();
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

    createBuyCollateralInteraction(market, buyer, collateralToken, collateralAmount, baseAmount, event);

    marketCollateralBalance.save();
}

export function handleWithdrawReserves(event: WithdrawReservesEvent): void {
    const market = getOrCreateMarket(event.address, event);
    const marketAccounting = getOrCreateMarketAccounting(market, event);
    const destination = event.params.to;
    const amount = event.params.amount;

    updateMarketAccounting(market, marketAccounting, event);

    createWithdrawReservesInteraction(market, destination, amount, event);

    marketAccounting.save();
}

export function handleTransfer(event: TransferEvent): void {
    const market = getOrCreateMarket(event.address, event);
    const marketAccounting = getOrCreateMarketAccounting(market, event);

    updateMarketAccounting(market, marketAccounting, event);
    // Don't track transfers for usage because they can come from all types of base interactions

    marketAccounting.save();
}
