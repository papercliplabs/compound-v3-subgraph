import { Address, log } from "@graphprotocol/graph-ts";
import { RewardClaimed as RewardClaimedEvent } from "../../generated/CometRewards/CometRewardsV2";
import { getOrCreateAccount } from "../mappingHelpers/account";
import { createClaimRewardsInteraction } from "../mappingHelpers/interaction";
import { getOrCreateMarket, getOrCreateMarketAccounting, getOrCreateMarketConfiguration, updateMarketAccounting } from "../mappingHelpers/market";
import { createPositionAccountingSnapshot, getOrCreatePositionAccounting, updatePositionAccounting } from "../mappingHelpers/position";
import { getOrCreateToken } from "../mappingHelpers/token";
import { Position, Transaction } from "../../generated/schema";
import { ZERO_BD, ZERO_BI } from "../common/constants";

export function handleRewardClaimed(event: RewardClaimedEvent): void {
    const accountAddress = event.params.src;
    const tokenAddress = event.params.token;
    const destination = event.params.recipient;
    const amount = event.params.amount;

    const account = getOrCreateAccount(accountAddress, event);
    const token = getOrCreateToken(tokenAddress, event);

    // infer position, this won't work if there are multiple rewards being claimed in 1 transaction
    // This happens when using the bulker, or a contract another contract is calling multiple claims (ex. smart wallet or vault)
    let positionClaimed: Position | null = null;
    let numberPositionsFound = 0;
    const positions = account.positions.load();
    for(let i = 0; i < positions.length; i++) {
        const position = positions[i];
        const positionAccounting = getOrCreatePositionAccounting(position, event);
        const market = getOrCreateMarket(Address.fromBytes(position.market), event);
        const marketAccounting = getOrCreateMarketAccounting(market, event);
        const marketConfig = getOrCreateMarketConfiguration(market, event);

        updateMarketAccounting(market, marketAccounting, event);
        updatePositionAccounting(position, positionAccounting, event); 

        if((marketConfig.baseTrackingSupplySpeed != ZERO_BI && positionAccounting.baseTrackingIndex == marketAccounting.trackingSupplyIndex) || (marketConfig.baseTrackingBorrowSpeed != ZERO_BI && positionAccounting.baseTrackingIndex == marketAccounting.trackingBorrowIndex)) {
            numberPositionsFound = numberPositionsFound + 1;
            if(positionClaimed) {
                // break;
            } 
            
            positionClaimed = position;
        }

        marketAccounting.save();
        // Don't save position accounting since this could make a useless snapshot
    }

    if(numberPositionsFound > 1) {
        positionClaimed = null;
    }

    const interaction = createClaimRewardsInteraction(account, positionClaimed, destination, token, amount, event);
    const transaction = Transaction.load(interaction.transaction)!;

    if(numberPositionsFound > 1) {
        log.warning("handleRewardClaimed - multiple positions inferred, ignoring, {} - {}", [numberPositionsFound.toString(), event.transaction.hash.toHexString()])
    } else if(!positionClaimed) {
        log.warning("handleRewardClaimed - no position found for claim {}", [event.transaction.hash.toHexString()]);
    } else {
        const positionAccounting = getOrCreatePositionAccounting(positionClaimed, event);

        updatePositionAccounting(positionClaimed, positionAccounting, event); 
        positionAccounting.cumulativeRewardsClaimed = positionAccounting.cumulativeRewardsClaimed.plus(interaction.amount);
        positionAccounting.cumulativeRewardsClaimedUsd = positionAccounting.cumulativeRewardsClaimedUsd.plus(interaction.amountUsd);
        positionAccounting.cumulativeGasUsedWei = positionAccounting.cumulativeGasUsedWei.plus(transaction.gasUsed ? transaction.gasUsed! : ZERO_BI);
        positionAccounting.cumulativeGasUsedUsd = positionAccounting.cumulativeGasUsedUsd.plus(transaction.gasUsedUsd ? transaction.gasUsedUsd! : ZERO_BD);
        positionAccounting.save();

        createPositionAccountingSnapshot(positionAccounting, event); // Manually update snapshot
    }
}
