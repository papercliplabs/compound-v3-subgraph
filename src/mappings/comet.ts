import { Supply as SupplyEvent, Upgraded as UpgradedEvent } from "../../generated/templates/Comet/Comet";
import { getOrCreateMarket, updateMarketConfiguration } from "../mappingHelpers/getOrCreate/market";

export function handleUpgraded(event: UpgradedEvent): void {
    // Create market if not yet made
    const market = getOrCreateMarket(event.transaction.from, event);

    // Trigger the market to update its configuration
    updateMarketConfiguration(market);
    market.save();
}

export function handleSupply(event: SupplyEvent): void {}
