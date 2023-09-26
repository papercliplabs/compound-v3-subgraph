import { Comet } from "../../generated/templates";
import { Upgraded as UpgradedEvent, SetFactory as SetFactoryEvent } from "../../generated/Configurator/Configurator";
import { getOrCreateProtocol } from "../mappingHelpers/getOrCreate/protocol";
import { getOrCreateMarket } from "../mappingHelpers/getOrCreate/market";

export function handleUpgraded(event: UpgradedEvent): void {
    let protocol = getOrCreateProtocol();
    protocol.configuratorImplementation = event.params.implementation;
    protocol.save();
}

export function handleSetFactory(event: SetFactoryEvent): void {
    const marketId = event.params.cometProxy;

    // Create dynamic data source
    Comet.create(marketId);
}

// import {
//   AddAsset as AddAssetEvent,
//   CometDeployed as CometDeployedEvent,
//   GovernorTransferred as GovernorTransferredEvent,
//   SetBaseBorrowMin as SetBaseBorrowMinEvent,
//   SetBaseMinForRewards as SetBaseMinForRewardsEvent,
//   SetBaseTokenPriceFeed as SetBaseTokenPriceFeedEvent,
//   SetBaseTrackingBorrowSpeed as SetBaseTrackingBorrowSpeedEvent,
//   SetBaseTrackingSupplySpeed as SetBaseTrackingSupplySpeedEvent,
//   SetBorrowKink as SetBorrowKinkEvent,
//   SetBorrowPerYearInterestRateBase as SetBorrowPerYearInterestRateBaseEvent,
//   SetBorrowPerYearInterestRateSlopeHigh as SetBorrowPerYearInterestRateSlopeHighEvent,
//   SetBorrowPerYearInterestRateSlopeLow as SetBorrowPerYearInterestRateSlopeLowEvent,
//   SetConfiguration as SetConfigurationEvent,
//   SetExtensionDelegate as SetExtensionDelegateEvent,
//   SetFactory as SetFactoryEvent,
//   SetGovernor as SetGovernorEvent,
//   SetPauseGuardian as SetPauseGuardianEvent,
//   SetStoreFrontPriceFactor as SetStoreFrontPriceFactorEvent,
//   SetSupplyKink as SetSupplyKinkEvent,
//   SetSupplyPerYearInterestRateBase as SetSupplyPerYearInterestRateBaseEvent,
//   SetSupplyPerYearInterestRateSlopeHigh as SetSupplyPerYearInterestRateSlopeHighEvent,
//   SetSupplyPerYearInterestRateSlopeLow as SetSupplyPerYearInterestRateSlopeLowEvent,
//   SetTargetReserves as SetTargetReservesEvent,
//   UpdateAsset as UpdateAssetEvent,
//   UpdateAssetBorrowCollateralFactor as UpdateAssetBorrowCollateralFactorEvent,
//   UpdateAssetLiquidateCollateralFactor as UpdateAssetLiquidateCollateralFactorEvent,
//   UpdateAssetLiquidationFactor as UpdateAssetLiquidationFactorEvent,
//   UpdateAssetPriceFeed as UpdateAssetPriceFeedEvent,
//   UpdateAssetSupplyCap as UpdateAssetSupplyCapEvent
// } from "../generated/Configurator/Configurator"
// import {
//   AddAsset,
//   CometDeployed,
//   GovernorTransferred,
//   SetBaseBorrowMin,
//   SetBaseMinForRewards,
//   SetBaseTokenPriceFeed,
//   SetBaseTrackingBorrowSpeed,
//   SetBaseTrackingSupplySpeed,
//   SetBorrowKink,
//   SetBorrowPerYearInterestRateBase,
//   SetBorrowPerYearInterestRateSlopeHigh,
//   SetBorrowPerYearInterestRateSlopeLow,
//   SetConfiguration,
//   SetExtensionDelegate,
//   SetFactory,
//   SetGovernor,
//   SetPauseGuardian,
//   SetStoreFrontPriceFactor,
//   SetSupplyKink,
//   SetSupplyPerYearInterestRateBase,
//   SetSupplyPerYearInterestRateSlopeHigh,
//   SetSupplyPerYearInterestRateSlopeLow,
//   SetTargetReserves,
//   UpdateAsset,
//   UpdateAssetBorrowCollateralFactor,
//   UpdateAssetLiquidateCollateralFactor,
//   UpdateAssetLiquidationFactor,
//   UpdateAssetPriceFeed,
//   UpdateAssetSupplyCap
// } from "../generated/schema"

// export function handleAddAsset(event: AddAssetEvent): void {
//   let entity = new AddAsset(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.assetConfig_asset = event.params.assetConfig.asset
//   entity.assetConfig_priceFeed = event.params.assetConfig.priceFeed
//   entity.assetConfig_decimals = event.params.assetConfig.decimals
//   entity.assetConfig_borrowCollateralFactor =
//     event.params.assetConfig.borrowCollateralFactor
//   entity.assetConfig_liquidateCollateralFactor =
//     event.params.assetConfig.liquidateCollateralFactor
//   entity.assetConfig_liquidationFactor =
//     event.params.assetConfig.liquidationFactor
//   entity.assetConfig_supplyCap = event.params.assetConfig.supplyCap

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleCometDeployed(event: CometDeployedEvent): void {
//   let entity = new CometDeployed(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.newComet = event.params.newComet

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleGovernorTransferred(
//   event: GovernorTransferredEvent
// ): void {
//   let entity = new GovernorTransferred(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.oldGovernor = event.params.oldGovernor
//   entity.newGovernor = event.params.newGovernor

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetBaseBorrowMin(event: SetBaseBorrowMinEvent): void {
//   let entity = new SetBaseBorrowMin(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldBaseBorrowMin = event.params.oldBaseBorrowMin
//   entity.newBaseBorrowMin = event.params.newBaseBorrowMin

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetBaseMinForRewards(
//   event: SetBaseMinForRewardsEvent
// ): void {
//   let entity = new SetBaseMinForRewards(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldBaseMinForRewards = event.params.oldBaseMinForRewards
//   entity.newBaseMinForRewards = event.params.newBaseMinForRewards

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetBaseTokenPriceFeed(
//   event: SetBaseTokenPriceFeedEvent
// ): void {
//   let entity = new SetBaseTokenPriceFeed(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldBaseTokenPriceFeed = event.params.oldBaseTokenPriceFeed
//   entity.newBaseTokenPriceFeed = event.params.newBaseTokenPriceFeed

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetBaseTrackingBorrowSpeed(
//   event: SetBaseTrackingBorrowSpeedEvent
// ): void {
//   let entity = new SetBaseTrackingBorrowSpeed(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldBaseTrackingBorrowSpeed = event.params.oldBaseTrackingBorrowSpeed
//   entity.newBaseTrackingBorrowSpeed = event.params.newBaseTrackingBorrowSpeed

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetBaseTrackingSupplySpeed(
//   event: SetBaseTrackingSupplySpeedEvent
// ): void {
//   let entity = new SetBaseTrackingSupplySpeed(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldBaseTrackingSupplySpeed = event.params.oldBaseTrackingSupplySpeed
//   entity.newBaseTrackingSupplySpeed = event.params.newBaseTrackingSupplySpeed

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetBorrowKink(event: SetBorrowKinkEvent): void {
//   let entity = new SetBorrowKink(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldKink = event.params.oldKink
//   entity.newKink = event.params.newKink

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetBorrowPerYearInterestRateBase(
//   event: SetBorrowPerYearInterestRateBaseEvent
// ): void {
//   let entity = new SetBorrowPerYearInterestRateBase(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldIRBase = event.params.oldIRBase
//   entity.newIRBase = event.params.newIRBase

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetBorrowPerYearInterestRateSlopeHigh(
//   event: SetBorrowPerYearInterestRateSlopeHighEvent
// ): void {
//   let entity = new SetBorrowPerYearInterestRateSlopeHigh(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldIRSlopeHigh = event.params.oldIRSlopeHigh
//   entity.newIRSlopeHigh = event.params.newIRSlopeHigh

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetBorrowPerYearInterestRateSlopeLow(
//   event: SetBorrowPerYearInterestRateSlopeLowEvent
// ): void {
//   let entity = new SetBorrowPerYearInterestRateSlopeLow(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldIRSlopeLow = event.params.oldIRSlopeLow
//   entity.newIRSlopeLow = event.params.newIRSlopeLow

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetConfiguration(event: SetConfigurationEvent): void {
//   let entity = new SetConfiguration(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldConfiguration_governor = event.params.oldConfiguration.governor
//   entity.oldConfiguration_pauseGuardian =
//     event.params.oldConfiguration.pauseGuardian
//   entity.oldConfiguration_baseToken = event.params.oldConfiguration.baseToken
//   entity.oldConfiguration_baseTokenPriceFeed =
//     event.params.oldConfiguration.baseTokenPriceFeed
//   entity.oldConfiguration_extensionDelegate =
//     event.params.oldConfiguration.extensionDelegate
//   entity.oldConfiguration_supplyKink = event.params.oldConfiguration.supplyKink
//   entity.oldConfiguration_supplyPerYearInterestRateSlopeLow =
//     event.params.oldConfiguration.supplyPerYearInterestRateSlopeLow
//   entity.oldConfiguration_supplyPerYearInterestRateSlopeHigh =
//     event.params.oldConfiguration.supplyPerYearInterestRateSlopeHigh
//   entity.oldConfiguration_supplyPerYearInterestRateBase =
//     event.params.oldConfiguration.supplyPerYearInterestRateBase
//   entity.oldConfiguration_borrowKink = event.params.oldConfiguration.borrowKink
//   entity.oldConfiguration_borrowPerYearInterestRateSlopeLow =
//     event.params.oldConfiguration.borrowPerYearInterestRateSlopeLow
//   entity.oldConfiguration_borrowPerYearInterestRateSlopeHigh =
//     event.params.oldConfiguration.borrowPerYearInterestRateSlopeHigh
//   entity.oldConfiguration_borrowPerYearInterestRateBase =
//     event.params.oldConfiguration.borrowPerYearInterestRateBase
//   entity.oldConfiguration_storeFrontPriceFactor =
//     event.params.oldConfiguration.storeFrontPriceFactor
//   entity.oldConfiguration_trackingIndexScale =
//     event.params.oldConfiguration.trackingIndexScale
//   entity.oldConfiguration_baseTrackingSupplySpeed =
//     event.params.oldConfiguration.baseTrackingSupplySpeed
//   entity.oldConfiguration_baseTrackingBorrowSpeed =
//     event.params.oldConfiguration.baseTrackingBorrowSpeed
//   entity.oldConfiguration_baseMinForRewards =
//     event.params.oldConfiguration.baseMinForRewards
//   entity.oldConfiguration_baseBorrowMin =
//     event.params.oldConfiguration.baseBorrowMin
//   entity.oldConfiguration_targetReserves =
//     event.params.oldConfiguration.targetReserves
//   entity.oldConfiguration_assetConfigs =
//     event.params.oldConfiguration.assetConfigs
//   entity.newConfiguration_governor = event.params.newConfiguration.governor
//   entity.newConfiguration_pauseGuardian =
//     event.params.newConfiguration.pauseGuardian
//   entity.newConfiguration_baseToken = event.params.newConfiguration.baseToken
//   entity.newConfiguration_baseTokenPriceFeed =
//     event.params.newConfiguration.baseTokenPriceFeed
//   entity.newConfiguration_extensionDelegate =
//     event.params.newConfiguration.extensionDelegate
//   entity.newConfiguration_supplyKink = event.params.newConfiguration.supplyKink
//   entity.newConfiguration_supplyPerYearInterestRateSlopeLow =
//     event.params.newConfiguration.supplyPerYearInterestRateSlopeLow
//   entity.newConfiguration_supplyPerYearInterestRateSlopeHigh =
//     event.params.newConfiguration.supplyPerYearInterestRateSlopeHigh
//   entity.newConfiguration_supplyPerYearInterestRateBase =
//     event.params.newConfiguration.supplyPerYearInterestRateBase
//   entity.newConfiguration_borrowKink = event.params.newConfiguration.borrowKink
//   entity.newConfiguration_borrowPerYearInterestRateSlopeLow =
//     event.params.newConfiguration.borrowPerYearInterestRateSlopeLow
//   entity.newConfiguration_borrowPerYearInterestRateSlopeHigh =
//     event.params.newConfiguration.borrowPerYearInterestRateSlopeHigh
//   entity.newConfiguration_borrowPerYearInterestRateBase =
//     event.params.newConfiguration.borrowPerYearInterestRateBase
//   entity.newConfiguration_storeFrontPriceFactor =
//     event.params.newConfiguration.storeFrontPriceFactor
//   entity.newConfiguration_trackingIndexScale =
//     event.params.newConfiguration.trackingIndexScale
//   entity.newConfiguration_baseTrackingSupplySpeed =
//     event.params.newConfiguration.baseTrackingSupplySpeed
//   entity.newConfiguration_baseTrackingBorrowSpeed =
//     event.params.newConfiguration.baseTrackingBorrowSpeed
//   entity.newConfiguration_baseMinForRewards =
//     event.params.newConfiguration.baseMinForRewards
//   entity.newConfiguration_baseBorrowMin =
//     event.params.newConfiguration.baseBorrowMin
//   entity.newConfiguration_targetReserves =
//     event.params.newConfiguration.targetReserves
//   entity.newConfiguration_assetConfigs =
//     event.params.newConfiguration.assetConfigs

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetExtensionDelegate(
//   event: SetExtensionDelegateEvent
// ): void {
//   let entity = new SetExtensionDelegate(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldExt = event.params.oldExt
//   entity.newExt = event.params.newExt

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetFactory(event: SetFactoryEvent): void {
//   let entity = new SetFactory(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldFactory = event.params.oldFactory
//   entity.newFactory = event.params.newFactory

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetGovernor(event: SetGovernorEvent): void {
//   let entity = new SetGovernor(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldGovernor = event.params.oldGovernor
//   entity.newGovernor = event.params.newGovernor

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetPauseGuardian(event: SetPauseGuardianEvent): void {
//   let entity = new SetPauseGuardian(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldPauseGuardian = event.params.oldPauseGuardian
//   entity.newPauseGuardian = event.params.newPauseGuardian

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetStoreFrontPriceFactor(
//   event: SetStoreFrontPriceFactorEvent
// ): void {
//   let entity = new SetStoreFrontPriceFactor(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldStoreFrontPriceFactor = event.params.oldStoreFrontPriceFactor
//   entity.newStoreFrontPriceFactor = event.params.newStoreFrontPriceFactor

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetSupplyKink(event: SetSupplyKinkEvent): void {
//   let entity = new SetSupplyKink(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldKink = event.params.oldKink
//   entity.newKink = event.params.newKink

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetSupplyPerYearInterestRateBase(
//   event: SetSupplyPerYearInterestRateBaseEvent
// ): void {
//   let entity = new SetSupplyPerYearInterestRateBase(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldIRBase = event.params.oldIRBase
//   entity.newIRBase = event.params.newIRBase

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetSupplyPerYearInterestRateSlopeHigh(
//   event: SetSupplyPerYearInterestRateSlopeHighEvent
// ): void {
//   let entity = new SetSupplyPerYearInterestRateSlopeHigh(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldIRSlopeHigh = event.params.oldIRSlopeHigh
//   entity.newIRSlopeHigh = event.params.newIRSlopeHigh

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetSupplyPerYearInterestRateSlopeLow(
//   event: SetSupplyPerYearInterestRateSlopeLowEvent
// ): void {
//   let entity = new SetSupplyPerYearInterestRateSlopeLow(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldIRSlopeLow = event.params.oldIRSlopeLow
//   entity.newIRSlopeLow = event.params.newIRSlopeLow

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleSetTargetReserves(event: SetTargetReservesEvent): void {
//   let entity = new SetTargetReserves(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldTargetReserves = event.params.oldTargetReserves
//   entity.newTargetReserves = event.params.newTargetReserves

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleUpdateAsset(event: UpdateAssetEvent): void {
//   let entity = new UpdateAsset(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.oldAssetConfig_asset = event.params.oldAssetConfig.asset
//   entity.oldAssetConfig_priceFeed = event.params.oldAssetConfig.priceFeed
//   entity.oldAssetConfig_decimals = event.params.oldAssetConfig.decimals
//   entity.oldAssetConfig_borrowCollateralFactor =
//     event.params.oldAssetConfig.borrowCollateralFactor
//   entity.oldAssetConfig_liquidateCollateralFactor =
//     event.params.oldAssetConfig.liquidateCollateralFactor
//   entity.oldAssetConfig_liquidationFactor =
//     event.params.oldAssetConfig.liquidationFactor
//   entity.oldAssetConfig_supplyCap = event.params.oldAssetConfig.supplyCap
//   entity.newAssetConfig_asset = event.params.newAssetConfig.asset
//   entity.newAssetConfig_priceFeed = event.params.newAssetConfig.priceFeed
//   entity.newAssetConfig_decimals = event.params.newAssetConfig.decimals
//   entity.newAssetConfig_borrowCollateralFactor =
//     event.params.newAssetConfig.borrowCollateralFactor
//   entity.newAssetConfig_liquidateCollateralFactor =
//     event.params.newAssetConfig.liquidateCollateralFactor
//   entity.newAssetConfig_liquidationFactor =
//     event.params.newAssetConfig.liquidationFactor
//   entity.newAssetConfig_supplyCap = event.params.newAssetConfig.supplyCap

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleUpdateAssetBorrowCollateralFactor(
//   event: UpdateAssetBorrowCollateralFactorEvent
// ): void {
//   let entity = new UpdateAssetBorrowCollateralFactor(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.asset = event.params.asset
//   entity.oldBorrowCF = event.params.oldBorrowCF
//   entity.newBorrowCF = event.params.newBorrowCF

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleUpdateAssetLiquidateCollateralFactor(
//   event: UpdateAssetLiquidateCollateralFactorEvent
// ): void {
//   let entity = new UpdateAssetLiquidateCollateralFactor(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.asset = event.params.asset
//   entity.oldLiquidateCF = event.params.oldLiquidateCF
//   entity.newLiquidateCF = event.params.newLiquidateCF

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleUpdateAssetLiquidationFactor(
//   event: UpdateAssetLiquidationFactorEvent
// ): void {
//   let entity = new UpdateAssetLiquidationFactor(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.asset = event.params.asset
//   entity.oldLiquidationFactor = event.params.oldLiquidationFactor
//   entity.newLiquidationFactor = event.params.newLiquidationFactor

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleUpdateAssetPriceFeed(
//   event: UpdateAssetPriceFeedEvent
// ): void {
//   let entity = new UpdateAssetPriceFeed(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.asset = event.params.asset
//   entity.oldPriceFeed = event.params.oldPriceFeed
//   entity.newPriceFeed = event.params.newPriceFeed

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }

// export function handleUpdateAssetSupplyCap(
//   event: UpdateAssetSupplyCapEvent
// ): void {
//   let entity = new UpdateAssetSupplyCap(
//     event.transaction.hash.concatI32(event.logIndex.toI32())
//   )
//   entity.cometProxy = event.params.cometProxy
//   entity.asset = event.params.asset
//   entity.oldSupplyCap = event.params.oldSupplyCap
//   entity.newSupplyCap = event.params.newSupplyCap

//   entity.blockNumber = event.block.number
//   entity.blockTimestamp = event.block.timestamp
//   entity.transactionHash = event.transaction.hash

//   entity.save()
// }
