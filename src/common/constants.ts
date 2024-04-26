import { Address, BigDecimal, BigInt, ByteArray, crypto} from "@graphprotocol/graph-ts";

export const ZERO_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000000");

export const DAYS_PER_YEAR: BigInt = BigInt.fromString("365");
export const SECONDS_PER_HOUR: BigInt = BigInt.fromString("3600");
export const SECONDS_PER_DAY: BigInt = BigInt.fromString("86400");
export const SECONDS_PER_WEEK: BigInt = BigInt.fromString("604800");
export const SECONDS_PER_YEAR: BigInt = BigInt.fromString("31536000");

export const SECONDS_PER_BLOCK: BigInt = BigInt.fromString("12");

export const ZERO_BI: BigInt = BigInt.fromU32(0);
export const ZERO_BD: BigDecimal = BigDecimal.fromString("0");
export const ONE_BI: BigInt = BigInt.fromU32(1);
export const ONE_BD: BigDecimal = BigDecimal.fromString("1");
export const BASE_INDEX_SCALE: BigInt = BigInt.fromString("1000000000000000"); // 10^15

export const COMET_FACTOR_SCALE: BigInt = BigInt.fromString("1000000000000000000"); // 10^18
export const REWARD_FACTOR_SCALE: BigInt = BigInt.fromString("1000000000000000000"); // 10^18
export const PRICE_FEED_FACTOR: BigDecimal = BigDecimal.fromString("100000000"); // 10^8

export namespace InteractionType {
    export const SUPPLY_BASE = "SUPPLY_BASE";
    export const WITHDRAW_BASE = "WITHDRAW_BASE";
    export const TRANSFER_BASE = "TRANSFER_BASE";
    export const LIQUIDATION = "LIQUIDATION";
    export const SUPPLY_COLLATERAL = "SUPPLY_COLLATERAL";
    export const WITHDRAW_COLLATERAL = "WITHDRAW_COLLATERAL";
    export const TRANSFER_COLLATERAL = "TRANSFER_COLLATERAL_TO";
}

export const SUPPLY_EVENT_SIGNATURE = crypto.keccak256(ByteArray.fromUTF8("Supply(address,address,uint256)"));;
export const WITHDRAW_EVENT_SIGNATURE = crypto.keccak256(ByteArray.fromUTF8("Withdraw(address,address,uint256)"));;
export const ABSORB_DEBT_EVENT_SIGNATURE = crypto.keccak256(ByteArray.fromUTF8("AbsorbDebt(address,address,uint256,uint256)"));;
