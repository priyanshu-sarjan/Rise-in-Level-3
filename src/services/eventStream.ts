import { STELLAR_CONFIG } from "@/config/stellar";

export interface OnChainEvent {
  id: string;
  contractId: string;
  topic: string;
  data: Record<string, any>;
  timestamp: string;
  ledger: number;
}

export type EventListener = (event: OnChainEvent) => void;

class SorobanEventStreamService {
  private listeners: EventListener[] = [];
  private isStreaming: boolean = false;
  private intervalId: any = null;
  private eventHistory: OnChainEvent[] = [
    {
      id: "evt-001",
      contractId: STELLAR_CONFIG.contracts.registryContractId,
      topic: "role_grant",
      data: { role: "ADMIN", user: "GB2X...9912", status: "AUTHORIZED" },
      timestamp: new Date(Date.now() - 3600000).toLocaleTimeString(),
      ledger: 4891021,
    },
    {
      id: "evt-002",
      contractId: STELLAR_CONFIG.contracts.trackerContractId,
      topic: "created",
      data: { itemId: "AYU-HERB-991", manufacturer: "GDK3...4412", batchId: "REG-991" },
      timestamp: new Date(Date.now() - 1800000).toLocaleTimeString(),
      ledger: 4891240,
    },
  ];

  public subscribe(listener: EventListener): () => void {
    this.listeners.push(listener);
    if (!this.isStreaming) {
      this.startPolling();
    }
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
      if (this.listeners.length === 0) {
        this.stopPolling();
      }
    };
  }

  public getHistory(): OnChainEvent[] {
    return [...this.eventHistory];
  }

  public emitCustomEvent(event: Omit<OnChainEvent, "id" | "timestamp" | "ledger">): OnChainEvent {
    const fullEvent: OnChainEvent = {
      ...event,
      id: `evt-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toLocaleTimeString(),
      ledger: 4891500 + Math.floor(Math.random() * 50),
    };
    this.eventHistory.unshift(fullEvent);
    this.listeners.forEach((l) => l(fullEvent));
    return fullEvent;
  }

  private startPolling() {
    this.isStreaming = true;
    this.intervalId = setInterval(() => {
      // Periodic ping check to Soroban RPC getEvents endpoint
      fetch(STELLAR_CONFIG.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getEvents",
          params: { startLedger: 4891000 },
        }),
      }).catch(() => {});
    }, 15000);
  }

  private stopPolling() {
    this.isStreaming = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

export const eventStreamService = new SorobanEventStreamService();
