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
    TransferBaseInteraction,
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
import { ChainlinkPriceFeed as ChainlinkPriceFeedContract } from "../../generated/templates/Comet/ChainlinkPriceFeed";
import { getChainlinkEthUsdPriceFeedAddress } from "../common/networkSpecific";
import { PRICE_FEED_FACTOR, ZERO_BI } from "../common/constants";
import { getOrCreatePositionAccounting } from "./position";

function getOrCreateTransaction(event: ethereum.Event): Transaction {
    const id = event.transaction.hash;
    let transaction = Transaction.load(id);

    if (!transaction) {
        transaction = new Transaction(id);

        transaction.hash = event.transaction.hash;
        transaction.blockNumber = event.block.number;
        transaction.timestamp = event.block.timestamp;

        transaction.from = event.transaction.from;
        transaction.to = event.transaction.to;

        transaction.gasLimit = event.transaction.gasLimit;
        transaction.gasPrice = event.transaction.gasPrice;

        transaction.supplyBaseInteractionCount = 0;
        transaction.withdrawBaseInteractionCount = 0;
        transaction.transferBaseInteractionCount = 0;
        transaction.absorbDebtInteractionCount = 0;
        transaction.supplyCollateralInteractionCount = 0;
        transaction.withdrawCollateralInteractionCount = 0;
        transaction.transferCollateralInteractionCount = 0;
        transaction.absorbCollateralInteractionCount = 0;
        transaction.buyCollateralInteractionCount = 0;
        transaction.withdrawReservesInteractionCount = 0;
        transaction.claimRewardsInteractionCount = 0;

        // event.receipt doesn't exist for older graph nodes and some chains, these are allows to be null in schema
        if (event.receipt) {
            const gasUsed = event.receipt!.gasUsed;
            transaction.gasUsed = gasUsed;

            const priceFeed = ChainlinkPriceFeedContract.bind(getChainlinkEthUsdPriceFeedAddress());
            const tryLatestRoundData = priceFeed.try_latestRoundData();
            if (!tryLatestRoundData.reverted) {
                const price = tryLatestRoundData.value.value1.toBigDecimal().div(PRICE_FEED_FACTOR);
                transaction.gasUsedUsd = computeTokenValueUsd(gasUsed.times(transaction.gasPrice), 18, price);
            }
        }

        transaction.save();
    }

    return transaction;
}

export function createSupplyBaseInteraction(
    market: Market,
    position: Position,
    supplier: Address,
    amount: BigInt,
    event: ethereum.Event
): SupplyBaseInteraction {
    const transaction = getOrCreateTransaction(event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);
    const baseToken = BaseToken.load(marketConfiguration.baseToken)!;
    const token = getOrCreateToken(Address.fromBytes(baseToken.token), event);
    const tokenPrice = getTokenPriceUsd(baseToken, event);
    const id = transaction.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));

    const interaction = new SupplyBaseInteraction(id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.position = position.id;
    interaction.supplier = supplier;

    interaction.asset = marketConfiguration.baseToken;
    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);

    interaction.save();

    // Update transaction count
    transaction.supplyBaseInteractionCount += 1;
    transaction.save();
    
    return interaction;
}

export function createWithdrawBaseInteraction(
    market: Market,
    position: Position,
    destination: Address,
    amount: BigInt,
    event: ethereum.Event
): WithdrawBaseInteraction {
    const transaction = getOrCreateTransaction(event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);
    const baseToken = BaseToken.load(marketConfiguration.baseToken)!;
    const token = getOrCreateToken(Address.fromBytes(baseToken.token), event);
    const tokenPrice = getTokenPriceUsd(baseToken, event);
    const id = transaction.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));

    const interaction = new WithdrawBaseInteraction(id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.position = position.id;
    interaction.destination = destination;

    interaction.asset = marketConfiguration.baseToken;
    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);

    interaction.save();

    // Update transaction count
    transaction.withdrawBaseInteractionCount += 1;
    transaction.save();

    return interaction;
}

export function createTransferBaseInteraction(
    market: Market,
    fromPosition: Position | null,
    toPosition: Position | null,
    amount: BigInt,
    event: ethereum.Event
): TransferBaseInteraction {
    const transaction = getOrCreateTransaction(event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);
    const baseToken = BaseToken.load(marketConfiguration.baseToken)!;
    const token = getOrCreateToken(Address.fromBytes(baseToken.token), event);
    const tokenPrice = getTokenPriceUsd(baseToken, event);
    const id = transaction.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));

    const interaction = new TransferBaseInteraction(id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    if(fromPosition) {
        interaction.fromPosition = fromPosition.id;
    }
    if(toPosition) {
        interaction.toPosition = toPosition.id;
    }

    interaction.asset = marketConfiguration.baseToken;
    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);

    interaction.save();

    // Update transaction count
    transaction.transferBaseInteractionCount += 1;
    transaction.save();

    return interaction;
}

export function createAbsorbDebtInteraction(
    market: Market,
    position: Position,
    absorber: Address,
    amount: BigInt,
    event: ethereum.Event
): AbsorbDebtInteraction {
    const transaction = getOrCreateTransaction(event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);
    const baseToken = BaseToken.load(marketConfiguration.baseToken)!;
    const token = getOrCreateToken(Address.fromBytes(baseToken.token), event);
    const tokenPrice = getTokenPriceUsd(baseToken, event);
    const id = transaction.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));

    const interaction = new AbsorbDebtInteraction(id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.position = position.id;
    interaction.absorber = absorber;

    interaction.asset = marketConfiguration.baseToken;

    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);;

    interaction.save();

    // Update transaction count
    transaction.absorbDebtInteractionCount += 1;
    transaction.save();

    return interaction;
}

export function createSupplyCollateralInteraction(
    market: Market,
    position: Position,
    supplier: Address,
    asset: CollateralToken,
    amount: BigInt,
    event: ethereum.Event
): SupplyCollateralInteraction {
    const transaction = getOrCreateTransaction(event);
    const token = getOrCreateToken(Address.fromBytes(asset.token), event);
    const tokenPrice = getTokenPriceUsd(asset, event);
    const id = transaction.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));

    const interaction = new SupplyCollateralInteraction(id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.position = position.id;
    interaction.supplier = supplier;

    interaction.asset = asset.id;
    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);

    interaction.save();

    // Update transaction count
    transaction.supplyCollateralInteractionCount += 1;
    transaction.save();

    return interaction;
}

export function createWithdrawCollateralInteraction(
    market: Market,
    position: Position,
    destination: Address,
    asset: CollateralToken,
    amount: BigInt,
    event: ethereum.Event
): WithdrawCollateralInteraction {
    const transaction = getOrCreateTransaction(event);
    const token = getOrCreateToken(Address.fromBytes(asset.token), event);
    const tokenPrice = getTokenPriceUsd(asset, event);
    const id = transaction.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));

    const interaction = new WithdrawCollateralInteraction(id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.position = position.id;
    interaction.destination = destination;

    interaction.asset = asset.id;
    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);

    interaction.save();

    // Update transaction count
    transaction.withdrawCollateralInteractionCount += 1;
    transaction.save();

    return interaction;
}

export function createTransferCollateralInteraction(
    market: Market,
    fromPosition: Position,
    toPosition: Position,
    asset: CollateralToken,
    amount: BigInt,
    event: ethereum.Event
): TransferCollateralInteraction {
    const transaction = getOrCreateTransaction(event);
    const token = getOrCreateToken(Address.fromBytes(asset.token), event);
    const tokenPrice = getTokenPriceUsd(asset, event);
    const id = transaction.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));

    const interaction = new TransferCollateralInteraction(id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.fromPosition = fromPosition.id;
    interaction.toPosition = toPosition.id;

    interaction.asset = asset.id;
    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);

    interaction.save();

    // Update transaction count
    transaction.transferCollateralInteractionCount += 1;
    transaction.save();

    return interaction;
}

export function createAbsorbCollateralInteraction(
    market: Market,
    position: Position,
    absorber: Address,
    asset: CollateralToken,
    amount: BigInt,
    event: ethereum.Event
): AbsorbCollateralInteraction {
    const transaction = getOrCreateTransaction(event);
    const token = getOrCreateToken(Address.fromBytes(asset.token), event);
    const tokenPrice = getTokenPriceUsd(asset, event);
    const id = transaction.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));

    const interaction = new AbsorbCollateralInteraction(id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.position = position.id;
    interaction.absorber = absorber;

    interaction.asset = asset.id;
    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);

    interaction.save();

    // Update transaction count
    transaction.absorbCollateralInteractionCount += 1;
    transaction.save();

    return interaction;
}

export function createBuyCollateralInteraction(
    market: Market,
    buyer: Address,
    asset: CollateralToken,
    collateralAmount: BigInt,
    baseAmount: BigInt,
    event: ethereum.Event
): void {
    const transaction = getOrCreateTransaction(event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);
    const baseToken = BaseToken.load(marketConfiguration.baseToken)!;
    const baseTokenPrice = getTokenPriceUsd(baseToken, event);
    const collateralPrice = getTokenPriceUsd(asset, event);

    const baseTokenToken = getOrCreateToken(Address.fromBytes(baseToken.token), event);
    const collateralTokenToken = getOrCreateToken(Address.fromBytes(asset.token), event);
    const id = transaction.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));

    const interaction = new BuyCollateralInteraction(id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.buyer = buyer;

    interaction.asset = asset.id;
    interaction.collateralAmount = collateralAmount;
    interaction.baseAmount = baseAmount;
    interaction.collateralAmountUsd = computeTokenValueUsd(
        interaction.collateralAmount,
        u8(collateralTokenToken.decimals),
        collateralPrice
    );
    interaction.baseAmountUsd = computeTokenValueUsd(
        interaction.baseAmount,
        u8(baseTokenToken.decimals),
        baseTokenPrice
    );

    interaction.save();

    // Update transaction count
    transaction.buyCollateralInteractionCount += 1;
    transaction.save();
}

export function createWithdrawReservesInteraction(
    market: Market,
    destination: Address,
    amount: BigInt,
    event: ethereum.Event
): void {
    const transaction = getOrCreateTransaction(event);
    const marketConfiguration = getOrCreateMarketConfiguration(market, event);
    const baseToken = BaseToken.load(marketConfiguration.baseToken)!;
    const token = getOrCreateToken(Address.fromBytes(baseToken.token), event);
    const tokenPrice = getTokenPriceUsd(baseToken, event);
    const id = transaction.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));

    const interaction = new WithdrawReservesInteraction(id);

    interaction.transaction = transaction.id;

    interaction.market = market.id;
    interaction.destination = destination;

    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(token.decimals), tokenPrice);

    interaction.save();

    // Update transaction count
    transaction.withdrawReservesInteractionCount += 1;
    transaction.save();
}

export function createClaimRewardsInteraction(
    account: Account,
    position: Position | null,
    destination: Address,
    token: Token,
    amount: BigInt,
    event: ethereum.Event
): ClaimRewardsInteraction {
    const transaction = getOrCreateTransaction(event);
    const tokenPrice = getTokenPriceUsd(token, event);
    const id = transaction.id.concat(Bytes.fromByteArray(Bytes.fromBigInt(event.logIndex)));

    const interaction = new ClaimRewardsInteraction(id);

    interaction.transaction = transaction.id;

    interaction.account = account.id;
    interaction.position = position == null ? null : position.id;
    interaction.destination = destination;

    interaction.token = token.id;
    interaction.amount = amount;
    interaction.amountUsd = computeTokenValueUsd(amount, u8(u8(token.decimals)), tokenPrice);

    interaction.save();

    // Update transaction count
    transaction.claimRewardsInteractionCount += 1;
    transaction.save();

    return interaction;
}
