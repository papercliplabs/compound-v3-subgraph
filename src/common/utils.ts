import { Address, BigDecimal, BigInt, ethereum, log as logger } from "@graphprotocol/graph-ts";
import { BASE_INDEX_SCALE, REWARD_FACTOR_SCALE, SUPPLY_EVENT_SIGNATURE, WITHDRAW_EVENT_SIGNATURE, ABSORB_DEBT_EVENT_SIGNATURE, ZERO_ADDRESS, ZERO_BD, ZERO_BI } from "./constants";
import { CometRewardsV1 as CometRewardsV1Contract } from "../../generated/templates/Comet/CometRewardsV1";
import { CometRewardsV2 as CometRewardsV2Contract } from "../../generated/templates/Comet/CometRewardsV2";
import { getCometRewardAddress } from "./networkSpecific";

/**
 * Divides a value by a given exponent of base 10 (10^exponent), and formats it as a BigDecimal
 * @param value value to be divided
 * @param exponent exponent to apply
 * @returns value / (10^exponent)
 */
export function formatUnits(value: BigInt, exponent: u8): BigDecimal {
    const powerTerm = BigInt.fromU32(10)
        .pow(exponent)
        .toBigDecimal();
    return value.toBigDecimal().div(powerTerm);
}

/**
 * Multiply value by a given exponent of base 10 (10^exponent), and formats it as a BigInt
 * @param value value to be multiplied
 * @param exponent exponent to apply
 * @returns value * 10^exponent
 */
export function parseUnits(value: BigDecimal, exponent: u8): BigInt {
    const powerTerm = BigInt.fromU32(10)
        .pow(exponent)
        .toBigDecimal();
    return BigInt.fromString(
        value
            .times(powerTerm)
            .truncate(0)
            .toString()
    );
}

export function computeTokenValueUsd(input: BigInt, decimals: u8, priceUsd: BigDecimal): BigDecimal {
    return formatUnits(input, decimals).times(priceUsd);
}

export function presentValue(principal: BigInt, index: BigInt): BigInt {
    return principal.times(index).div(BASE_INDEX_SCALE);
}

export function principalValue(presentValue: BigInt, index: BigInt): BigInt {
    return bigIntSafeDiv(presentValue.times(BASE_INDEX_SCALE), index);
}

export function bigDecimalSafeDiv(num: BigDecimal, den: BigDecimal): BigDecimal {
    if (den.equals(ZERO_BD)) {
        return ZERO_BD;
    } else {
        return num.div(den);
    }
}

export function bigDecimalMin(a: BigDecimal, b: BigDecimal): BigDecimal {
    return a.lt(b) ? a : b;
}

export function bigDecimalMax(a: BigDecimal, b: BigDecimal): BigDecimal {
    return a.gt(b) ? a : b;
}

export function bigIntMin(a: BigInt, b: BigInt): BigInt {
    return a.lt(b) ? a : b;
}

export function bigIntMax(a: BigInt, b: BigInt): BigInt {
    return a.gt(b) ? a : b;
}

/**
 * Compute a - b, clamping at 0
 * @param a
 * @param b
 * @returns min(a - b, 0)
 */
export function bigIntSafeMinus(a: BigInt, b: BigInt): BigInt {
    return b.gt(a) ? ZERO_BI : a.minus(b);
}

export function bigIntSafeDiv(num: BigInt, den: BigInt): BigInt {
    if (den.equals(ZERO_BI)) {
        return ZERO_BI;
    } else {
        return num.div(den);
    }
}

class RewardConfigData {
    tokenAddress: Address;
    rescaleFactor: BigInt;
    shouldUpscale: boolean;
    multiplier: BigInt;
}

export function getRewardConfigData(marketAddress: Address): RewardConfigData {
    const cometRewardsV1 = CometRewardsV1Contract.bind(getCometRewardAddress());
    const cometRewardsV2 = CometRewardsV2Contract.bind(getCometRewardAddress());

    // Reward, note that there are 2 versions, first one didn't have multiplier
    let tryRewardConfig = cometRewardsV2.try_rewardConfig(marketAddress);
    if (tryRewardConfig.reverted) {
        // It is V1 instead
        const tryRewardConfigV1 = cometRewardsV1.try_rewardConfig(marketAddress);
        if (tryRewardConfigV1.reverted) {
            logger.warning("All reward configs reverted - {}", [marketAddress.toHexString()]);
            return {
                tokenAddress: ZERO_ADDRESS,
                rescaleFactor: ZERO_BI,
                shouldUpscale: true,
                multiplier: REWARD_FACTOR_SCALE,
            };
        } else {
            const rewardConfig = tryRewardConfigV1.value;
            return {
                tokenAddress: rewardConfig.getToken(),
                rescaleFactor: rewardConfig.getRescaleFactor(),
                shouldUpscale: rewardConfig.getShouldUpscale(),
                multiplier: REWARD_FACTOR_SCALE,
            };
        }
    } else {
        // V2
        const rewardConfig = tryRewardConfig.value;
        return {
            tokenAddress: rewardConfig.getToken(),
            rescaleFactor: rewardConfig.getRescaleFactor(),
            shouldUpscale: rewardConfig.getShouldUpscale(),
            multiplier: rewardConfig.getMultiplier(),
        };
    }
}

export function logsContainWithdrawOrSupplyOrAbsorbDebtEvents(event: ethereum.Event): boolean {
    const receipt = event.receipt;

    if (!receipt) {
        // Should never get here since we require receipts in subgraph.yaml
        logger.error("No logs for event: {} {}", [event.transaction.hash.toHexString(), event.logIndex.toString()]);
        return false;
    }

    for (let i = 0; i < receipt.logs.length; i++) {
        const log = receipt.logs[i];

        if (log.topics.length > 0) {
            const eventSignature = log.topics[0];
            if (SUPPLY_EVENT_SIGNATURE == eventSignature || WITHDRAW_EVENT_SIGNATURE == eventSignature || ABSORB_DEBT_EVENT_SIGNATURE == eventSignature) {
                return true;
            }
        }
    }

    return false;
}
