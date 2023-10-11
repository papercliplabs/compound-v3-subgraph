# Deployments

-   Ethereum Mainnet:
    -   [Hosted Subgraph](https://thegraph.com/hosted-service/subgraph/papercliplabs/compound-v3)

# Usage Notes

-   All percentages are represented as decimals in [0.0, 1.0]
-   baseTransfer will not emit any events if all value changed is on the borrow side. For this reason, it it possible that positions that did baseTransfers may be out of date until interaction happens involving that position do another interaction with the market. There is an issue open in Compound's comet repo here to add this event: https://github.com/compound-finance/comet/issues/816
-   All interactions to the comet contract emit a specific event except for except for baseTransfer (see above^). Also, the `Transfer` event gets omitted anytime the cToken balances change, for this reason we update accounting on a Transfer event (which is generally redundant, except for the special case described above). For this reason, we don't explicitly track this interaction for usage as this would result in duplicate counting.
-   USD balances are as of the last time an entity got updated. If there are no entity updates for a long period the "current" values will not be very accurate and should be instead constructed using the token balance and the current token price pulled from elsewhere.

# Compound v3 Contract Block Diagram Overview

```mermaid
erDiagram
		GOUVERNER_BRAVO ||--|| TIMELOCK : "ProposalCreated|VoteCase|ProposalCanceled|ProposalQueued|ProposalExecuted"
		TIMELOCK ||--|| CONFIGURATOR_PROXY : "QueueTransaction|CancelTranscation|ExecuteTransaction"
		CONFIGURATOR_PROXY ||--|| CONFIGURATOR : ""
		CONFIGURATOR ||--o{ COMET_FACTORY : "SetFactory"
		COMET_FACTORY ||--o{ COMET : ""
		CONFIGURATOR ||--o{ COMET_PROXY : "CometDeployed|SetConfiguration|AddAsset|..."
		COMET_REWARDS }|--|{ COMET_PROXY : ""
		COMET_PROXY ||--|| COMET : ""
		LENDER_OR_BORROWER }|--|{ COMET_PROXY : "Supply|Transfer|Withdraw|Approve"
		LENDER_OR_BORROWER }|--|{ COMET_REWARDS : "RewardClaimed"
		GOVERNANCE_PARTICIPANT }|--|| GOUVERNER_BRAVO : "Create|Vote|Cancel|Queue|Execute"
		LIQUIDATOR }|--|{ COMET_PROXY : "Absorb|BuyCollatoral"
		COMET }|--|{ PRICE_FEED : ""
```

# Subgraph Development

Install dependencies:

```bash
yarn
```

Autogen code:

```bash
yarn codegen
```

Build:

```bash
yarn build --network <network_name>

yarn build --network mainnet
yarn build --network matic
yarn build --network base
yarn build --network arbitrum-one
```

Deploy:

```bash
yarn deploy-<network_name> --access-token <access_token>

yarn deploy-mainnet --access-token <access_token>
yarn deploy-matic --access-token <access_token>
yarn deploy-base --access-token <access_token>
yarn deploy-arbitrum-one --access-token <access_token>
```

# Validation

Validation is summarized in [this spreadsheet](https://docs.google.com/spreadsheets/d/1LWKhGglj5AQbRJOgTfqkDOssok-QBzzifwl1gk8rxCc/edit#gid=1642772597)

Helpers used to derive the data for validation can be found in:

-   Jupyter notebook [query.ipynb](./validation/query.ipynb): used to query subgraph and plot data
-   The script [directContract.ts](./validation/directContract.ts): used to read comet contracts at specified blocks to compare with the subgraph

to run directContract.ts

```bash
cd validation
yarn install
ts-node directContract.ts
```
