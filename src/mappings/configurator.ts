import { Comet } from "../../generated/templates";
import { Upgraded as UpgradedEvent, SetFactory as SetFactoryEvent } from "../../generated/Configurator/Configurator";
import { getOrCreateProtocol } from "../mappingHelpers/protocol";

export function handleUpgraded(event: UpgradedEvent): void {
    let protocol = getOrCreateProtocol(event);
    protocol.configuratorImplementation = event.params.implementation;
    protocol.save();
}

export function handleSetFactory(event: SetFactoryEvent): void {
    const marketId = event.params.cometProxy;

    // Create dynamic data source, market gets created later on upgrade (deployment)
    Comet.create(marketId);
}
