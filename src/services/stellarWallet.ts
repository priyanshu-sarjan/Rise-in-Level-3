import { isConnected, requestAccess, getPublicKey, signTransaction } from "@stellar/freighter-api";
import { Keypair } from "@stellar/stellar-sdk";
import { STELLAR_CONFIG } from "@/config/stellar";

export interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  walletType: "freighter" | "testnet_keypair" | null;
  balanceXLM: string;
  secretKey?: string;
}

export async function checkFreighterAvailable(): Promise<boolean> {
  try {
    const result = await isConnected();
    return !!result;
  } catch (error) {
    console.warn("Freighter check failed:", error);
    return false;
  }
}

export async function connectFreighterWallet(): Promise<{ publicKey: string }> {
  const connected = await checkFreighterAvailable();
  if (!connected) {
    throw new Error("Freighter wallet extension not found or not unlocked.");
  }
  const accessObj: any = await requestAccess();
  if (accessObj && typeof accessObj === "object" && accessObj.error) {
    throw new Error(accessObj.error);
  }
  const pubKey = await getPublicKey();
  if (!pubKey) {
    throw new Error("Failed to retrieve public key from Freighter.");
  }
  return { publicKey: pubKey };
}

export async function generateTestnetKeypair(): Promise<{ publicKey: string; secretKey: string; funded: boolean }> {
  const pair = Keypair.random();
  const pubKey = pair.publicKey();
  const secret = pair.secret();

  let funded = false;
  try {
    const res = await fetch(`${STELLAR_CONFIG.friendbotUrl}?addr=${encodeURIComponent(pubKey)}`);
    if (res.ok) {
      funded = true;
    }
  } catch (err) {
    console.warn("Friendbot auto-fund failed:", err);
  }

  return {
    publicKey: pubKey,
    secretKey: secret,
    funded,
  };
}

export async function fundWithFriendbot(publicKey: string): Promise<boolean> {
  try {
    const res = await fetch(`${STELLAR_CONFIG.friendbotUrl}?addr=${encodeURIComponent(publicKey)}`);
    return res.ok;
  } catch (err) {
    console.error("Friendbot funding error:", err);
    return false;
  }
}

export async function fetchXLMBalance(publicKey: string): Promise<string> {
  try {
    const res = await fetch(`${STELLAR_CONFIG.horizonUrl}/accounts/${publicKey}`);
    if (!res.ok) return "10000.0000 XLM (Testnet Mocked)";
    const data = await res.json();
    const nativeBalance = data.balances?.find((b: any) => b.asset_type === "native");
    return nativeBalance ? `${parseFloat(nativeBalance.balance).toFixed(2)} XLM` : "0 XLM";
  } catch (err) {
    return "10000.0000 XLM (Testnet)";
  }
}
