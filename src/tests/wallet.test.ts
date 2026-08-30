import { describe, it, expect } from "vitest";
import {
  checkFreighterAvailable,
  generateTestnetKeypair,
  fetchXLMBalance,
} from "../services/stellarWallet";

describe("Stellar Wallet Service", () => {
  it("should return false or boolean when checking Freighter availability", async () => {
    const isAvailable = await checkFreighterAvailable();
    expect(typeof isAvailable).toBe("boolean");
  });

  it("should generate a valid Stellar testnet keypair", async () => {
    const keypair = await generateTestnetKeypair();
    expect(keypair).toHaveProperty("publicKey");
    expect(keypair).toHaveProperty("secretKey");
    expect(keypair.publicKey).toMatch(/^G[A-Z0-9]{55}$/);
    expect(keypair.secretKey).toMatch(/^S[A-Z0-9]{55}$/);
  }, 15000);

  it("should fetch balance string for public key", async () => {
    const dummyKey = "GD5X2P7V5Z5J5TESTNETPUBLICKEYDEMO1234567890";
    const balance = await fetchXLMBalance(dummyKey);
    expect(typeof balance).toBe("string");
    expect(balance).toContain("XLM");
  });
});
