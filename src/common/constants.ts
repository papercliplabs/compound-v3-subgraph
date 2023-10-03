import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export const CONFIGURATOR_PROXY_ADDRESS = Address.fromString("0x316f9708bB98af7dA9c68C1C3b5e79039cD336E3");
export const COMET_REWARDS_ADDRESS = Address.fromString("0x1B0e765F6224C21223AeA2af16c1C46E38885a40");

export const CHAINLINK_ORACLE_ADDRESS = Address.fromString("0x47Fb2585D2C56Fe188D0E6ec628a38b74fCeeeDf");
export const CHAINLINK_USD_ADDRESS = Address.fromString("0x0000000000000000000000000000000000000348");

export const DAYS_PER_YEAR: BigInt = BigInt.fromString("365");
export const SECONDS_PER_HOUR: BigInt = BigInt.fromString("3600");
export const SECONDS_PER_DAY: BigInt = BigInt.fromString("86400");
export const SECONDS_PER_YEAR: BigInt = BigInt.fromString("31536000");

export const SECONDS_PER_BLOCK: BigInt = BigInt.fromString("12");
export const BLOCKS_PER_DAY: BigInt = SECONDS_PER_DAY.div(SECONDS_PER_BLOCK);

export const ZERO_BI: BigInt = BigInt.fromU32(0);
export const ZERO_BD: BigDecimal = BigDecimal.fromString("0");
export const ONE_BI: BigInt = BigInt.fromU32(1);
export const ONE_BD: BigDecimal = BigDecimal.fromString("1");
export const BASE_INDEX_SCALE: BigInt = BigInt.fromString("1000000000000000"); // 10^15

export const REWARD_FACTOR_SCALE: BigInt = BigInt.fromString("1000000000000000000"); // 10^18
export const PRICE_FEED_FACTOR: BigDecimal = BigDecimal.fromString("100000000"); // 10^8

export namespace TransactionType {
    export const SUPPLY_BASE = "SUPPLY_BASE";
    export const WITHDRAW_BASE = "WITHDRAW_BASE";
    export const LIQUIDATION = "LIQUIDATION";
    export const SUPPLY_COLLATERAL = "SUPPLY_COLLATERAL";
    export const WITHDRAW_COLLATERAL = "WITHDRAW_COLLATERAL";
    export const TRANSFER_COLLATERAL = "TRANSFER_COLLATERAL_TO";
}
