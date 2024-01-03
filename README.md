# Deployments

-   Ethereum Mainnet:
    -   [Hosted Subgraph](https://thegraph.com/hosted-service/subgraph/papercliplabs/compound-v3-mainnet)
    -   [Decentralized Subgraph](https://thegraph.com/explorer/subgraphs/5nwMCSHaTqG3Kd2gHznbTXEnZ9QNWsssQfbHhDqQSQFp?view=Overview&chain=arbitrum-one)
-   Polygon
    -   [Hosted Subgraph](https://thegraph.com/hosted-service/subgraph/papercliplabs/compound-v3-polygon)
    -   [Decentralized Subgraph](https://thegraph.com/explorer/subgraphs/AaFtUWKfFdj2x8nnE3RxTSJkHwGHvawH3VWFBykCGzLs?view=Overview&chain=arbitrum-one)
-   Arbitrum
    -   [Hosted Subgraph](https://thegraph.com/hosted-service/subgraph/papercliplabs/compound-v3-arbitrum)
    -   [Decentralized Subgraph](https://thegraph.com/explorer/subgraphs/Ff7ha9ELmpmg81D6nYxy4t8aGP26dPztqD1LDJNPqjLS?view=Overview&chain=arbitrum-one)
-   Base
    -   [Hosted Subgraph](https://thegraph.com/hosted-service/subgraph/papercliplabs/compound-v3-base)
    -   [Decentralized Subgraph](https://thegraph.com/explorer/subgraphs/2hcXhs36pTBDVUmk5K2Zkr6N4UYGwaHuco2a6jyTsijo?view=Overview&chain=arbitrum-one)

Decentralized subgraphs require an API key. We provide one for the Compound Community, just ask for it in the Compound discord! Please don't abuse this, otherwise we will have to revoke it.

# Usage Notes

-   All percentages are represented as decimals in [0.0, 1.0]
-   baseTransfer will not emit any events if all value changed is on the borrow side. For this reason, it it possible that positions that did baseTransfers may be out of date until interaction happens involving that position do another interaction with the market. There is an issue open in Compound's comet repo here to add this event: https://github.com/compound-finance/comet/issues/816
-   All interactions to the comet contract emit a specific event except for except for baseTransfer (see above^). Also, the `Transfer` event gets omitted anytime the cToken balances change, for this reason we update accounting on a Transfer event (which is generally redundant, except for the special case described above). For this reason, we don't explicitly track this interaction for usage as this would result in duplicate counting.
-   USD balances are as of the last time an entity got updated. If there are no entity updates for a long period the "current" values will not be very accurate and should be instead constructed using the token balance and the current token price pulled from elsewhere.

# Compound v3 Contract Block Diagram Overview

```mermaid
erDiagram
		GOVERNOR_BRAVO ||--|| TIMELOCK : "ProposalCreated|VoteCase|ProposalCanceled|ProposalQueued|ProposalExecuted"
		TIMELOCK ||--|| CONFIGURATOR_PROXY : "QueueTransaction|CancelTranscation|ExecuteTransaction"
		CONFIGURATOR_PROXY ||--|| CONFIGURATOR : ""
		CONFIGURATOR ||--o{ COMET_FACTORY : "SetFactory"
		COMET_FACTORY ||--o{ COMET : ""
		CONFIGURATOR ||--o{ COMET_PROXY : "CometDeployed|SetConfiguration|AddAsset|..."
		COMET_REWARDS }|--|{ COMET_PROXY : ""
		COMET_PROXY ||--|| COMET : ""
		LENDER_OR_BORROWER }|--|{ COMET_PROXY : "Supply|Transfer|Withdraw|Approve"
		LENDER_OR_BORROWER }|--|{ COMET_REWARDS : "RewardClaimed"
		GOVERNANCE_PARTICIPANT }|--|| GOVERNOR_BRAVO : "Create|Vote|Cancel|Queue|Execute"
		LIQUIDATOR }|--|{ COMET_PROXY : "Absorb|BuyCollatoral"
		COMET }|--|{ PRICE_FEED : ""
```

# Subgraph Development

> In the below commands, replace <network> with one of [mainnet, polygon, arbitrum-one, base, goerli]

Install dependencies:

```bash
yarn
```

Copy .env.example to .env and populate it

```
cp .env.example .env
```

Run code generation

```bash
yarn codegen
```

Build

```bash
yarn build:<network> 
```

Deploy to the hosted network

```bash
yarn deploy-hosted:<network>
```

Deploy to the subgraph studio

```bash
yarn deploy-studio:<network>
```

Codegen, build and deploy everywhere in one command
```bash
yarn auto-deploy:<network> v<version (X.Y.Z)>

# Example
yarn auto-deploy:mainnet v0.0.1
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
