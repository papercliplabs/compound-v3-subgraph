import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";
import { BASE_INDEX_SCALE, COMET_REWARDS_ADDRESS, SECONDS_PER_YEAR, ZERO_BD, ZERO_BI } from "./constants";
import { CometRewardsV1 as CometRewardsV1Contract } from "../../generated/templates/Comet/CometRewardsV1";
import { CometRewardsV2 as CometRewardsV2Contract } from "../../generated/templates/Comet/CometRewardsV2";

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

/**
 * Compute the annual percent rate (APR), this doesn't take into account compounding like APY does
 * @param utilization utilization point of the market (total borrow / total supply)
 * @param kink interest rate curve utilization kink point, this is where the high slope will begin to be used
 * @param perSecondInterestRateBase base interest rate
 * @param perSecondInterestRateSlopeLow interest rate slope before kink
 * @param perSecondInterestRateSlopeHigh interest rate slope after kink
 */
export function computeApr(
    utilization: BigDecimal,
    kink: BigDecimal,
    perSecondInterestRateBase: BigInt,
    perSecondInterestRateSlopeLow: BigInt,
    perSecondInterestRateSlopeHigh: BigInt
): BigDecimal {
    const utilizationScaled = parseUnits(utilization, 18);
    const kinkScaled = parseUnits(kink, 18);

    const perSecondBeforeKinkContribution = perSecondInterestRateSlopeLow.times(
        bigIntMin(utilizationScaled, kinkScaled)
    );
    const perSecondAfterKinkContribution = perSecondInterestRateSlopeHigh.times(
        bigIntSafeMinus(utilizationScaled, kinkScaled)
    );

    const perSecondRate = perSecondInterestRateBase
        .plus(perSecondBeforeKinkContribution)
        .plus(perSecondAfterKinkContribution);
    const apr = formatUnits(perSecondRate.times(SECONDS_PER_YEAR), 18);

    return apr;
}

export function presentValue(principal: BigInt, index: BigInt): BigInt {
    return principal.times(index).div(BASE_INDEX_SCALE);
}

export function principalValue(presentValue: BigInt, index: BigInt): BigInt {
    return bigIntSafeDiv(presentValue.times(BASE_INDEX_SCALE), index);
}

export class bigIntSignedPlusRet {
    sum: BigInt;
    sumIsNeg: boolean;
}

export function bigIntSignedPlus(a: BigInt, aIsNeg: boolean, b: BigInt, bIsNeg: boolean): bigIntSignedPlusRet {
    let sum = ZERO_BI;
    let sumIsNeg = false;

    if (aIsNeg == bIsNeg) {
        sum = a.plus(b);
        sumIsNeg = aIsNeg;
    } else if (aIsNeg) {
        // A neg, B pos
        sumIsNeg = a.gt(b);
        sum = sumIsNeg ? a.minus(b) : b.minus(a);
    } else {
        // A pos, B neg
        sumIsNeg = b.gt(a);
        sum = sumIsNeg ? b.minus(a) : a.minus(b);
    }

    return { sum, sumIsNeg };
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
    const cometRewardsV1 = CometRewardsV1Contract.bind(COMET_REWARDS_ADDRESS);
    const cometRewardsV2 = CometRewardsV2Contract.bind(COMET_REWARDS_ADDRESS);

    // Reward, note that there are 2 versions, first one didn't have multiplier
    let tryRewardConfig = cometRewardsV2.try_rewardConfig(marketAddress);
    if (tryRewardConfig.reverted) {
        // It is V1 instead
        const rewardConfig = cometRewardsV1.rewardConfig(marketAddress);
        return {
            tokenAddress: rewardConfig.getToken(),
            rescaleFactor: rewardConfig.getRescaleFactor(),
            shouldUpscale: rewardConfig.getShouldUpscale(),
            multiplier: ZERO_BI,
        };
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
