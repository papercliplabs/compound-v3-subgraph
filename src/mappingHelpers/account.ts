import { Address, ethereum } from "@graphprotocol/graph-ts";
import { Account } from "../../generated/schema";
import { getOrCreateProtocol } from "./protocol";
import { ONE_BI } from "../common/constants";

export function getOrCreateAccount(address: Address, event: ethereum.Event): Account {
    let account = Account.load(address);

    if (!account) {
        account = new Account(address);

        account.creationBlockNumber = event.block.number;
        account.address = address;

        account.save();
    }

    return account;
}
