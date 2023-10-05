import { Address, BigInt, Bytes, ethereum } from "@graphprotocol/graph-ts";
import {
    Market,
    Position,
    CollateralToken,
    Token,
    Account,
    ClaimRewardsInteraction,
    Transaction,
    BaseToken,
    SupplyBaseInteraction,
    WithdrawBaseInteraction,
    AbsorbDebtInteraction,
    SupplyCollateralInteraction,
    WithdrawCollateralInteraction,
    TransferCollateralInteraction,
    AbsorbCollateralInteraction,
    BuyCollateralInteraction,
    WithdrawReservesInteraction,
} from "../../generated/schema";
import { getOrCreateMarketConfiguration } from "./market";
import { getOrCreateToken, getTokenPriceUsd } from "./token";
import { computeTokenValueUsd } from "../common/utils";

function createTransaction(event: ethereum.Event): Transaction {
    const id = event.transaction.hash.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));

    const transaction = new Transaction(id);

    transaction.hash = event.transaction.hash;
    transaction.logIndex = event.logIndex;
    transaction.blockNumber = event.block.number;
    transaction.timestamp = event.block.timestamp;

    transaction.from = event.transaction.from;
    transaction.to = event.transaction.to;

    transaction.gasLimit = event.transaction.gasLimit;
    transaction.gasPrice = event.transaction.gasPrice;
    transaction.gasUsed = event.receipt ? event.receipt!.gasUsed : null;

    transaction.save();

    return transaction;
}

export function createSupplyBaseInteraction(
    market: Market,
    position: Position,
    supplier: Address,
    amount: BigInt,
    event: ethereum.Event
): void {
    const transaction = createTransaction(event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);
    const baseToken = BaseToken.load(marketConfiguration.baseToken)!;
    const token = getOrCreateToken(Address.fromBytes(baseToken.token), event);
    const tokenPrice = getTokenPriceUsd(baseToken, event);

    const interaction = new SupplyBaseInteraction(transaction.id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.position = position.id;
    interaction.supplier = supplier;

    interaction.asset = marketConfiguration.baseToken;
    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);

    interaction.save();
}

export function createWithdrawBaseInteraction(
    market: Market,
    position: Position,
    destination: Address,
    amount: BigInt,
    event: ethereum.Event
): void {
    const transaction = createTransaction(event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);
    const baseToken = BaseToken.load(marketConfiguration.baseToken)!;
    const token = getOrCreateToken(Address.fromBytes(baseToken.token), event);
    const tokenPrice = getTokenPriceUsd(baseToken, event);

    const interaction = new WithdrawBaseInteraction(transaction.id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.position = position.id;
    interaction.destination = destination;

    interaction.asset = marketConfiguration.baseToken;
    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);

    interaction.save();
}

export function createAbsorbDebtInteraction(
    market: Market,
    position: Position,
    absorber: Address,
    amount: BigInt,
    event: ethereum.Event
): void {
    const transaction = createTransaction(event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);
    const baseToken = BaseToken.load(marketConfiguration.baseToken)!;
    const token = getOrCreateToken(Address.fromBytes(baseToken.token), event);
    const tokenPrice = getTokenPriceUsd(baseToken, event);

    const interaction = new AbsorbDebtInteraction(transaction.id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.position = position.id;
    interaction.absorber = absorber;

    interaction.asset = marketConfiguration.baseToken;
    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);

    interaction.save();
}

export function createSupplyCollateralInteraction(
    market: Market,
    position: Position,
    supplier: Address,
    asset: CollateralToken,
    amount: BigInt,
    event: ethereum.Event
): void {
    const transaction = createTransaction(event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);
    const baseToken = BaseToken.load(marketConfiguration.baseToken)!;
    const token = getOrCreateToken(Address.fromBytes(baseToken.token), event);
    const tokenPrice = getTokenPriceUsd(baseToken, event);

    const interaction = new SupplyCollateralInteraction(transaction.id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.position = position.id;
    interaction.supplier = supplier;

    interaction.asset = asset.id;
    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);

    interaction.save();
}

export function createWithdrawCollateralInteraction(
    market: Market,
    position: Position,
    destination: Address,
    asset: CollateralToken,
    amount: BigInt,
    event: ethereum.Event
): void {
    const transaction = createTransaction(event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);
    const baseToken = BaseToken.load(marketConfiguration.baseToken)!;
    const token = getOrCreateToken(Address.fromBytes(baseToken.token), event);
    const tokenPrice = getTokenPriceUsd(baseToken, event);

    const interaction = new WithdrawCollateralInteraction(transaction.id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.position = position.id;
    interaction.destination = destination;

    interaction.asset = asset.id;
    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);

    interaction.save();
}

export function createTransferCollateralInteraction(
    market: Market,
    fromPosition: Position,
    toPosition: Position,
    asset: CollateralToken,
    amount: BigInt,
    event: ethereum.Event
): void {
    const transaction = createTransaction(event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);
    const baseToken = BaseToken.load(marketConfiguration.baseToken)!;
    const token = getOrCreateToken(Address.fromBytes(baseToken.token), event);
    const tokenPrice = getTokenPriceUsd(baseToken, event);

    const interaction = new TransferCollateralInteraction(transaction.id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.fromPosition = fromPosition.id;
    interaction.toPosition = toPosition.id;

    interaction.asset = asset.id;
    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);

    interaction.save();
}

export function createAbsorbCollateralInteraction(
    market: Market,
    position: Position,
    absorber: Address,
    asset: CollateralToken,
    amount: BigInt,
    event: ethereum.Event
): void {
    const transaction = createTransaction(event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);
    const baseToken = BaseToken.load(marketConfiguration.baseToken)!;
    const token = getOrCreateToken(Address.fromBytes(baseToken.token), event);
    const tokenPrice = getTokenPriceUsd(baseToken, event);

    const interaction = new AbsorbCollateralInteraction(transaction.id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.position = position.id;
    interaction.absorber = absorber;

    interaction.asset = asset.id;
    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);

    interaction.save();
}

export function createBuyCollateralInteraction(
    market: Market,
    buyer: Address,
    asset: CollateralToken,
    collateralAmount: BigInt,
    baseAmount: BigInt,
    event: ethereum.Event
): void {
    const transaction = createTransaction(event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);
    const baseToken = BaseToken.load(marketConfiguration.baseToken)!;
    const token = getOrCreateToken(Address.fromBytes(baseToken.token), event);
    const tokenPrice = getTokenPriceUsd(baseToken, event);
    const collateralPrice = getTokenPriceUsd(collateralAmount, event);

    const interaction = new BuyCollateralInteraction(transaction.id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.buyer = buyer;

    interaction.asset = asset.id;
    interaction.collateralAmount = collateralAmount;
    interaction.baseAmount = baseAmount;
    interaction.collateralAmountUsd = computeTokenValueUsd(
        interaction.collateralAmount,
        u8(token.decimals),
        collateralPrice
    );
    interaction.baseAmountUsd = computeTokenValueUsd(interaction.baseAmount, u8(token.decimals), tokenPrice);

    interaction.save();
}

export function createWithdrawReservesInteraction(
    market: Market,
    destination: Address,
    amount: BigInt,
    event: ethereum.Event
): void {
    const transaction = createTransaction(event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);
    const baseToken = BaseToken.load(marketConfiguration.baseToken)!;
    const token = getOrCreateToken(Address.fromBytes(baseToken.token), event);
    const tokenPrice = getTokenPriceUsd(baseToken, event);

    const interaction = new WithdrawReservesInteraction(transaction.id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.destination = destination;

    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);

    interaction.save();
}

export function createClaimRewardsInteraction(
    account: Account,
    destination: Address,
    token: Token,
    amount: BigInt,
    event: ethereum.Event
): void {
    const transaction = createTransaction(event);
    const tokenPrice = getTokenPriceUsd(token, event);

    const interaction = new ClaimRewardsInteraction(transaction.id);

    interaction.transaction = transaction.id;

    interaction.account = account.id;
    interaction.destination = destination;

    interaction.token = token.id;
    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(u8(token.decimals)), tokenPrice);

    interaction.save();
}
