import { Protocol } from "../../generated/schema";
import { CONFIGURATOR_PROXY_ADDRESS } from "../common/constants";

export function getOrCreateProtocol(): Protocol {
    let protocol = Protocol.load(CONFIGURATOR_PROXY_ADDRESS);

    if (!protocol) {
        protocol = new Protocol(CONFIGURATOR_PROXY_ADDRESS);

        protocol.configuratorProxy = CONFIGURATOR_PROXY_ADDRESS;
        // protocol.configuratorImplementation  // TODO: also here need to read storage slot

        protocol.save();
    }

    return protocol;
}
