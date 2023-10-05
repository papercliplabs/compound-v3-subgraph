import { RewardClaimed as RewardClaimedEvent } from "../../generated/CometRewards/CometRewards";
import { getOrCreateAccount } from "../mappingHelpers/account";
import { createClaimRewardsInteraction } from "../mappingHelpers/interaction";
import { getOrCreateToken } from "../mappingHelpers/token";

export function handleRewardClaimed(event: RewardClaimedEvent): void {
    const accountAddress = event.params.src;
    const tokenAddress = event.params.token;
    const destination = event.params.recipient;
    const amount = event.params.amount;

    const account = getOrCreateAccount(accountAddress, event);
    const token = getOrCreateToken(tokenAddress, event);

    createClaimRewardsInteraction(account, destination, token, amount, event);
}
