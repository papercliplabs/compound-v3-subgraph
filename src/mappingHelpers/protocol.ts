import { Bytes } from "@graphprotocol/graph-ts";
import { Protocol, _ActiveAccount } from "../../generated/schema";
import { CONFIGURATOR_PROXY_ADDRESS } from "../common/constants";

import { getOrCreateUsage } from "./usage";

export function getOrCreateProtocol(): Protocol {
    let protocol = Protocol.load(CONFIGURATOR_PROXY_ADDRESS);

    if (!protocol) {
        protocol = new Protocol(CONFIGURATOR_PROXY_ADDRESS);

        protocol.configuratorProxy = CONFIGURATOR_PROXY_ADDRESS;

        const usage = getOrCreateUsage(Bytes.fromUTF8("PROTOCOL_CUMULATIVE"));

        protocol.cumulativeUsage = usage.id;

        protocol.save();
    }

    return protocol;
}
