/**
 * AgriFresh / AyuTrace Autonomous Supply Chain Intelligence Agent
 * Target Network: HeLa Labs (Mainnet / Testnet)
 * Protocol: HeLa-DePIN-ColdChain-v1
 */

import { ethers } from "ethers";

// Contract ABI Definition for ColdChain Verification & Escrow
const COLDCHAIN_ABI = [
  "function create_item_with_registry(bytes32 batchId, string commodity, address producer, uint256 tempMinMicroC, uint256 tempMaxMicroC, uint256 maxEthylenePpb) external",
  "function add_checkpoint_verified(bytes32 batchId, string checkpointType, uint256 tempMicroC, uint256 ethylenePpb, uint256 riskScoreBps, string geohash) external",
  "function execute_sla_penalty(bytes32 batchId, uint8 breachType, uint256 penaltyPercentageBps, string reason) external",
  "event BatchRegistered(bytes32 indexed batchId, string commodity, address indexed producer)",
  "event CheckpointLogged(bytes32 indexed batchId, string checkpointType, uint256 riskScoreBps)",
  "event SLAPenaltyTriggered(bytes32 indexed batchId, uint8 breachType, uint256 penaltyPercentageBps)"
];

class AgriFreshAgent {
  constructor(config) {
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    try {
      this.wallet = new ethers.Wallet(config.privateKey, this.provider);
    } catch (err) {
      // Fallback to random wallet for simulation if private key is redacted or unconfigured
      this.wallet = ethers.Wallet.createRandom().connect(this.provider);
    }
    
    let targetAddress = config.contractAddress;
    try {
      if (targetAddress && typeof targetAddress === "string") {
        targetAddress = ethers.getAddress(targetAddress.toLowerCase());
      }
    } catch (e) {
      // keep original if parsing fails
    }

    this.contract = new ethers.Contract(targetAddress, COLDCHAIN_ABI, this.wallet);
    this.riskThresholdSla = config.riskThresholdSla || 0.75;
    this.riskThresholdCooling = config.riskThresholdCooling || 0.40;
  }

  // Convert string Batch ID to bytes32 format
  toBytes32(text) {
    return ethers.encodeBytes32String(text.slice(0, 31));
  }

  // 1. PERCEIVE: Analyze Telemetry & Spoilage Metrics
  analyzePacket(packet) {
    const { batchId, commodity, sensors, slaThresholds, location } = packet;
    let tempExcursion = 0;
    let ethyleneExcursion = 0;

    if (sensors.tempCelsius > slaThresholds.tempMax) {
      tempExcursion = sensors.tempCelsius - slaThresholds.tempMax;
    } else if (sensors.tempCelsius < slaThresholds.tempMin) {
      tempExcursion = slaThresholds.tempMin - sensors.tempCelsius;
    }

    if (sensors.ethylenePpm > slaThresholds.maxEthylene) {
      ethyleneExcursion = sensors.ethylenePpm - slaThresholds.maxEthylene;
    }

    // Dynamic Spoilage Index calculation
    const baseRisk = packet.spoilageRiskScore || 0;
    const computedRisk = Math.min(
      1.0,
      baseRisk + (tempExcursion * 0.12) + (ethyleneExcursion * 0.25) + (sensors.shockG > 1.0 ? 0.15 : 0)
    );

    return {
      batchId,
      commodity,
      tempCelsius: sensors.tempCelsius,
      ethylenePpm: sensors.ethylenePpm,
      shockG: sensors.shockG,
      geohash: location.geohash,
      riskScore: +computedRisk.toFixed(2),
      isBreached: computedRisk >= this.riskThresholdSla,
      isWarning: computedRisk >= this.riskThresholdCooling && computedRisk < this.riskThresholdSla
    };
  }

  // 2. REASON & ACT: Autonomous Evaluation and HeLa On-Chain Execution
  async processTelemetry(telemetryFeed) {
    console.log(`[AgriFresh Agent] Ingesting ${telemetryFeed.length} telemetry packets...`);

    for (const packet of telemetryFeed) {
      const evaluation = this.analyzePacket(packet);
      console.log(`[Eval] Packet ${packet.packetId} | Batch: ${evaluation.batchId} | Risk: ${evaluation.riskScore}`);

      if (evaluation.isBreached) {
        console.warn(`[CRITICAL SLA EXCURSION] Triggering on-chain SLA penalty for ${evaluation.batchId}`);
        await this.submitCheckpoint(evaluation, "TRANSIT_EXCURSION_CRITICAL");
        await this.slashEscrow(evaluation, 1, 2500, "Severe temperature and ethylene excursion breached SLA limits");
      } else if (evaluation.isWarning) {
        console.warn(`[WARNING] Logging checkpoint and cooling alert for ${evaluation.batchId}`);
        await this.submitCheckpoint(evaluation, "COOLING_ALERT_ACTIVE");
      } else {
        // Periodic nominal state checkpoint
        if (packet.packetId.endsWith("0") || packet.packetId.endsWith("5")) {
          await this.submitCheckpoint(evaluation, "TRANSIT_NOMINAL");
        }
      }
    }
  }

  // Submit verified checkpoint to HeLa Contract
  async submitCheckpoint(evalData, checkpointType) {
    try {
      const bId = this.toBytes32(evalData.batchId);
      const tempMicroC = Math.round(evalData.tempCelsius * 1000000);
      const ethylenePpb = Math.round(evalData.ethylenePpm * 1000);
      const riskBps = Math.round(evalData.riskScore * 10000);

      const tx = await this.contract.add_checkpoint_verified(
        bId,
        checkpointType,
        tempMicroC,
        ethylenePpb,
        riskBps,
        evalData.geohash
      );
      console.log(`[Tx Submitted] add_checkpoint_verified TxHash: ${tx.hash}`);
      await tx.wait();
      console.log(`[Tx Confirmed] Checkpoint registered on HeLa-Mainnet`);
    } catch (err) {
      console.error(`[Execution Error] add_checkpoint_verified failed:`, err.message);
    }
  }

  // Execute SLA penalty / escrow slash
  async slashEscrow(evalData, breachType, penaltyBps, reason) {
    try {
      const bId = this.toBytes32(evalData.batchId);
      const tx = await this.contract.execute_sla_penalty(
        bId,
        breachType,
        penaltyBps,
        reason
      );
      console.log(`[Tx Submitted] execute_sla_penalty TxHash: ${tx.hash}`);
      await tx.wait();
      console.log(`[Tx Confirmed] Escrow penalty executed on HeLa-Mainnet`);
    } catch (err) {
      console.error(`[Execution Error] execute_sla_penalty failed:`, err.message);
    }
  }
}

export { AgriFreshAgent };
