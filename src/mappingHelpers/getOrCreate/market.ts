import { Address } from "@graphprotocol/graph-ts";
import { Market } from "../../../generated/schema";

export function getOrCreateMarket(marketId: Address): Market {
    let market = Market.load(marketId);

    if (!market) {
        market = new Market(marketId);

        market.cometProxy = marketId;

        market.save();
    }

    return market;
}
