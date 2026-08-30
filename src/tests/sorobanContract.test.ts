import { describe, it, expect } from "vitest";
import {
  createItemWithRegistry,
  addCheckpointVerified,
} from "../services/sorobanContract";

describe("Soroban Contract Service", () => {
  it("should create item with inter-contract registry verification", async () => {
    const res = await createItemWithRegistry({
      itemId: "TEST-ITEM-101",
      name: "Organic Neem Extract",
      category: "Botanical",
      origin: "Tamil Nadu",
      manufacturer: "GB2X9912TESTNETPUBLICKEYINSPECTOR9988776655",
    });

    expect(res.success).toBe(true);
    expect(res.txHash).toMatch(/^0x[a-f0-9]{64}$/);
    expect(res.item.id).toBe("TEST-ITEM-101");
    expect(res.item.checkpointCount).toBe(1);
    expect(res.interContractCalls.methodCalled).toContain("create_item_with_registry");
  });

  it("should append verified checkpoint with role check", async () => {
    const res = await addCheckpointVerified({
      itemId: "TEST-ITEM-101",
      location: "Madurai Logistics Hub",
      status: "IN_TRANSIT",
      notes: "Temperature monitored 3.8C",
      verifiedBy: "GB2X9912TESTNETPUBLICKEYINSPECTOR9988776655",
    });

    expect(res.success).toBe(true);
    expect(res.authorizationChecked).toBe(true);
    expect(res.checkpoint.index).toBe(2);
    expect(res.checkpoint.status).toBe("IN_TRANSIT");
  });
});
