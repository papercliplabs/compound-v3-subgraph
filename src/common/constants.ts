import { Address, BigDecimal, BigInt } from "@graphprotocol/graph-ts";

export const CONFIGURATOR_PROXY_ADDRESS = Address.fromString("0x316f9708bB98af7dA9c68C1C3b5e79039cD336E3");

export const SECONDS_PER_YEAR: BigInt = BigInt.fromString("31536000");

export const ZERO_BI: BigInt = BigInt.fromU32(0);
export const ZERO_BD: BigDecimal = BigDecimal.fromString("0");
export const BASE_INDEX_SCALE: BigInt = BigInt.fromString("1000000000000000");
