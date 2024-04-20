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
    createTransferBaseInteraction,
} from "../mappingHelpers/interaction";
import {
    getOrCreateMarketCollateralBalance,
    getOrCreatePositionCollateralBalance,
    updateMarketCollateralBalance,
    updatePositionCollateralBalance,
} from "../mappingHelpers/collateralBalance";
import { getOrCreateCollateralToken, getOrCreateToken } from "../mappingHelpers/token";
import { InteractionType, ZERO_ADDRESS, ZERO_BI } from "../common/constants";
import { updateUsageMetrics } from "../mappingHelpers/usage";
import { bigIntMax, bigIntMin, logsContainWithdrawOrSupplyEvents, presentValue } from "../common/utils";

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

    const supplyBaseInteraction = createSupplyBaseInteraction(market, position, from, amount, event);

    // Update position accounting
    updatePositionAccounting(position, positionAccounting, event);
    positionAccounting.cumulativeBaseSupplied = positionAccounting.cumulativeBaseSupplied.plus(supplyBaseInteraction.amount);
    positionAccounting.cumulativeBaseSuppliedUsd = positionAccounting.cumulativeBaseSuppliedUsd.plus(supplyBaseInteraction.amountUsd);

    updateUsageMetrics(account, market, InteractionType.SUPPLY_BASE, event);

    positionAccounting.save();
    marketAccounting.save();
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

    const interaction = createWithdrawBaseInteraction(market, position, destination, amount, event);

    // Update position cumulatives
    updatePositionAccounting(position, positionAccounting, event);
    positionAccounting.cumulativeBaseWithdrawn = positionAccounting.cumulativeBaseWithdrawn.plus(interaction.amount);
    positionAccounting.cumulativeBaseWithdrawnUsd = positionAccounting.cumulativeBaseWithdrawnUsd.plus(interaction.amountUsd);

    updateUsageMetrics(account, market, InteractionType.WITHDRAW_BASE, event);

    positionAccounting.save();
    marketAccounting.save();
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
    if(logsContainWithdrawOrSupplyEvents(event)) {
        // Ignore any transfers when there is supply or withdraw events
        return;
    }

    const transferFromAddress = event.params.from;
    const transferToAddress = event.params.to;

    const market = getOrCreateMarket(event.address, event);
    const marketAccounting = getOrCreateMarketAccounting(market, event);

    updateMarketAccounting(market, marketAccounting, event);

    // Transfers are only ever burn or mint (never actually between accounts)
    if(transferFromAddress.notEqual(ZERO_ADDRESS)) {
        const fromAccount = getOrCreateAccount(transferFromAddress, event);
        const fromPosition = getOrCreatePosition(market, fromAccount, event);
        const fromPositionAccounting = getOrCreatePositionAccounting(fromPosition, event);

        const basePrincipalBefore = fromPositionAccounting.basePrincipal;
        updatePositionAccounting(fromPosition, fromPositionAccounting, event);
        const basePrincipalAfter = fromPositionAccounting.basePrincipal;

        const withdrawPrincipal = basePrincipalBefore.gt(ZERO_BI) ? basePrincipalBefore.minus(bigIntMax(basePrincipalAfter, ZERO_BI)) : ZERO_BI; 
        const borrowPrincipal = basePrincipalAfter.lt(ZERO_BI) ? bigIntMin(basePrincipalBefore, ZERO_BI).minus(basePrincipalAfter) : ZERO_BI; 

        const withdrawBase = presentValue(withdrawPrincipal, marketAccounting.baseSupplyIndex);
        const borrowBase = presentValue(borrowPrincipal, marketAccounting.baseBorrowIndex);
        const totalBaseWithdraw = withdrawBase.plus(borrowBase);

        const interaction = createTransferBaseInteraction(market, fromPosition, totalBaseWithdraw.neg(), event);

        fromPositionAccounting.cumulativeBaseWithdrawn = fromPositionAccounting.cumulativeBaseWithdrawn.minus(interaction.amount); // Double negative here
        fromPositionAccounting.cumulativeBaseWithdrawnUsd = fromPositionAccounting.cumulativeBaseWithdrawnUsd.minus(interaction.amountUsd); // Double negative here

        fromPositionAccounting.save();

        updateUsageMetrics(fromAccount, market, InteractionType.TRANSFER_BASE, event);
    } else {
        const toAccount = getOrCreateAccount(transferToAddress, event);
        const toPosition = getOrCreatePosition(market, toAccount, event);
        const toPositionAccounting = getOrCreatePositionAccounting(toPosition, event);

        const basePrincipalBefore = toPositionAccounting.basePrincipal;
        updatePositionAccounting(toPosition, toPositionAccounting, event);
        const basePrincipalAfter = toPositionAccounting.basePrincipal;

        const supplyPrincipal = basePrincipalAfter.gt(ZERO_BI) ? basePrincipalAfter.minus(bigIntMax(basePrincipalBefore, ZERO_BI)) : ZERO_BI; 
        const repayPrincipal = basePrincipalBefore.lt(ZERO_BI) ? bigIntMin(basePrincipalAfter, ZERO_BI).minus(basePrincipalBefore) : ZERO_BI; 

        const supplyBase = presentValue(supplyPrincipal, marketAccounting.baseSupplyIndex);
        const repayBase = presentValue(repayPrincipal, marketAccounting.baseBorrowIndex);
        const totalBaseSupply = supplyBase.plus(repayBase);

        const interaction = createTransferBaseInteraction(market, toPosition, totalBaseSupply, event);

        toPositionAccounting.cumulativeBaseSupplied = toPositionAccounting.cumulativeBaseSupplied.plus(interaction.amount); 
        toPositionAccounting.cumulativeBaseSuppliedUsd = toPositionAccounting.cumulativeBaseSuppliedUsd.plus(interaction.amountUsd); 

        toPositionAccounting.save();

        updateUsageMetrics(toAccount, market, InteractionType.TRANSFER_BASE, event);
    }


    marketAccounting.save();
}
