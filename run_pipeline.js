import { AgriFreshAgent } from "./agrifresh_agent.js";

const config = {
  rpcUrl: process.env.HELA_RPC_URL || "https://mainnet-rpc.helachain.com",
  privateKey: process.env.AGENT_PRIVATE_KEY || "[REDACTED]",
  contractAddress: "0x4B37a8929e01B93F62E29B12c87A4FfA40c741D8",
  riskThresholdSla: 0.75,
  riskThresholdCooling: 0.40
};

const sampleFeed = [
  {
    packetId: "PKT-HL-001",
    batchId: "BATCH-AF-BERRY-8821",
    commodity: "Organic Blueberries",
    timestamp: new Date().toISOString(),
    sensors: { tempCelsius: 1.8, humidityRh: 91.2, ethylenePpm: 0.08, shockG: 0.12 },
    location: { lat: 18.5204, lng: 73.8567, geohash: "tek3y9e" },
    slaThresholds: { tempMin: 0.5, tempMax: 3.0, maxEthylene: 0.5 },
    spoilageRiskScore: 0.02
  },
  {
    packetId: "PKT-HL-005",
    batchId: "BATCH-AF-BERRY-8821",
    commodity: "Organic Blueberries",
    timestamp: new Date().toISOString(),
    sensors: { tempCelsius: 6.8, humidityRh: 78.3, ethylenePpm: 0.82, shockG: 0.40 },
    location: { lat: 18.6420, lng: 73.9450, geohash: "tek7h2v" },
    slaThresholds: { tempMin: 0.5, tempMax: 3.0, maxEthylene: 0.5 },
    spoilageRiskScore: 0.87
  }
];

async function main() {
  const agent = new AgriFreshAgent(config);
  await agent.processTelemetry(sampleFeed);
}

main().catch(console.error);
