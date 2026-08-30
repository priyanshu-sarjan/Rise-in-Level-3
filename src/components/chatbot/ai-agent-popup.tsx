import { useState, useRef, useEffect } from "react";
import {
  Bot,
  Send,
  X,
  Sparkles,
  Zap,
  RefreshCw,
  Truck,
  TrendingDown,
  ShieldAlert,
  ChevronUp,
  Maximize2,
  Minimize2,
  Terminal,
  Activity,
  CheckCircle2,
  Wallet,
  Cpu,
  Layers,
  Radio,
  Copy,
  ExternalLink,
  ShieldCheck,
  PlusCircle,
  Link as LinkIcon,
  ArrowRightLeft,
  Key,
  Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  connectFreighterWallet,
  generateTestnetKeypair,
  fundWithFriendbot,
  fetchXLMBalance,
  WalletState,
} from "@/services/stellarWallet";

import {
  createItemWithRegistry,
  addCheckpointVerified,
  SorobanItem,
  SorobanCheckpoint,
} from "@/services/sorobanContract";

import { eventStreamService, OnChainEvent } from "@/services/eventStream";
import { STELLAR_CONFIG } from "@/config/stellar";

interface ToolResult {
  toolName: string;
  args: Record<string, any>;
  result: any;
}

interface Message {
  id: string;
  sender: "user" | "agent";
  text: string;
  toolCall?: ToolResult;
  timestamp: string;
}

const REGIONAL_SURPLUS_DATA: Record<string, { surplusPercentage: number; crop: string; status: string }> = {
  "Ariyalur": { surplusPercentage: 108.2, crop: "Tomato", status: "Critical Overproduction" },
  "Perambalur": { surplusPercentage: 15.0, crop: "Onion", status: "Normal" },
  "Nashik": { surplusPercentage: 85.0, crop: "Tomato", status: "High Overproduction" },
  "Gwalior": { surplusPercentage: 42.0, crop: "Mango", status: "Moderate Overproduction" },
};

const COLD_STORAGE_FACILITIES: Record<string, { capacityFilled: number; availableTons: number }> = {
  "Facility A": { capacityFilled: 65, availableTons: 350 },
  "Facility B": { capacityFilled: 88, availableTons: 120 },
  "Mumbai Hub": { capacityFilled: 45, availableTons: 550 },
  "Pune APMC": { capacityFilled: 30, availableTons: 700 },
};

export function AIAgentPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState("mcp");

  // --- MCP AI Chat State ---
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "agent",
      text: "⚡ **AyuTrace MCP Logistics & Web3 Soroban Hub Active**\nConnected to `ayutrace-logistics-engine v1.0.0` MCP Server & Stellar Soroban Testnet.\n\nI can execute real-time telemetry scans, calculate spoilage velocity, connect Freighter wallets, execute inter-contract calls between Contract A (Registry) & Contract B (Tracker), and stream on-chain events.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // --- Web3 Wallet State ---
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    publicKey: null,
    walletType: null,
    balanceXLM: "0.00 XLM",
  });
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  // --- Soroban Smart Contract Operation State ---
  const [createItemForm, setCreateItemForm] = useState({
    itemId: "AYU-BATCH-" + Math.floor(100 + Math.random() * 900),
    name: "Ashwagandha Organic Root",
    category: "Botanical",
    origin: "Kerala, India",
  });
  const [contractTxLoading, setContractTxLoading] = useState(false);
  const [lastTxResult, setLastTxResult] = useState<any>(null);

  const [checkpointForm, setCheckpointForm] = useState({
    itemId: "AYU-BATCH-991",
    location: "Chennai Processing Hub",
    status: "QUALITY_VERIFIED",
    notes: "Cold chain telemetry stable at 4°C",
  });

  // --- Event Stream State ---
  const [events, setEvents] = useState<OnChainEvent[]>([]);

  useEffect(() => {
    setEvents(eventStreamService.getHistory());
    const unsubscribe = eventStreamService.subscribe((evt) => {
      setEvents((prev) => [evt, ...prev]);
    });
    return () => unsubscribe();
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && activeTab === "mcp") {
      scrollToBottom();
    }
  }, [messages, isOpen, activeTab]);

  // Handle Freighter Connection
  const handleConnectFreighter = async () => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      const { publicKey } = await connectFreighterWallet();
      const balance = await fetchXLMBalance(publicKey);
      setWallet({
        isConnected: true,
        publicKey,
        walletType: "freighter",
        balanceXLM: balance,
      });
    } catch (err: any) {
      setWalletError(err.message || "Failed to connect Freighter wallet.");
    } finally {
      setWalletLoading(false);
    }
  };

  // Handle Keypair Generation + Friendbot Auto-Funding
  const handleGenerateKeypair = async () => {
    setWalletLoading(true);
    setWalletError(null);
    try {
      const res = await generateTestnetKeypair();
      const balance = await fetchXLMBalance(res.publicKey);
      setWallet({
        isConnected: true,
        publicKey: res.publicKey,
        walletType: "testnet_keypair",
        balanceXLM: balance,
        secretKey: res.secretKey,
      });
    } catch (err: any) {
      setWalletError("Keypair generation error: " + err.message);
    } finally {
      setWalletLoading(false);
    }
  };

  // Handle Contract Inter-Contract Item Creation
  const handleCreateContractItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setContractTxLoading(true);
    setLastTxResult(null);

    const mfr = wallet.publicKey || "GD5X2P7V5Z5J5TESTNETPUBLICKEYDEMO1234567890";
    try {
      const result = await createItemWithRegistry({
        itemId: createItemForm.itemId,
        name: createItemForm.name,
        category: createItemForm.category,
        origin: createItemForm.origin,
        manufacturer: mfr,
      });

      setLastTxResult(result);
      eventStreamService.emitCustomEvent({
        contractId: STELLAR_CONFIG.contracts.trackerContractId,
        topic: "created",
        data: {
          itemId: createItemForm.itemId,
          name: createItemForm.name,
          manufacturer: mfr.slice(0, 8) + "...",
          interContractRegistry: STELLAR_CONFIG.contracts.registryContractId.slice(0, 8) + "...",
        },
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      setContractTxLoading(false);
    }
  };

  // Handle Checkpoint Verification
  const handleAddCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    setContractTxLoading(true);
    setLastTxResult(null);

    const inspector = wallet.publicKey || "GB2X9912TESTNETPUBLICKEYINSPECTOR9988776655";
    try {
      const result = await addCheckpointVerified({
        itemId: checkpointForm.itemId,
        location: checkpointForm.location,
        status: checkpointForm.status,
        notes: checkpointForm.notes,
        verifiedBy: inspector,
      });

      setLastTxResult(result);
      eventStreamService.emitCustomEvent({
        contractId: STELLAR_CONFIG.contracts.trackerContractId,
        topic: "ckpt_add",
        data: {
          itemId: checkpointForm.itemId,
          location: checkpointForm.location,
          status: checkpointForm.status,
          verifiedBy: inspector.slice(0, 8) + "...",
        },
      });
    } catch (err: any) {
      console.error(err);
    } finally {
      setContractTxLoading(false);
    }
  };

  // Execute Simulated MCP Tools
  const executeMCPTool = (name: string, args: Record<string, any>): any => {
    switch (name) {
      case "check_regional_surplus": {
        const district = String(args.district || "Ariyalur");
        const data = REGIONAL_SURPLUS_DATA[district];
        if (!data) {
          return {
            district,
            message: `District '${district}' not found in active telemetry. Normal baseline assumed.`,
          };
        }
        return {
          district,
          ...data,
          actionNeeded: data.surplusPercentage > 50 ? "Trigger Priority Dispatch & Reroute" : "Standard Logistics",
        };
      }
      case "predict_spoilage_velocity": {
        const temp = Number(args.ambientTemperature || 35);
        const duration = Number(args.transitDurationHours || 24);
        const crop = String(args.crop || "Tomato");

        const decayScore = Math.min(100, Math.round((temp / 40) * (duration / 72) * 100));
        const priorityTier = decayScore > 60 ? "Priority 1 (Urgent)" : "Priority 2 (Standard)";
        const estimatedShelfLifeHours = Math.max(0, 96 - Math.round((temp * duration) / 15));

        return {
          crop,
          ambientTemperature: `${temp}°C`,
          transitDuration: `${duration} hrs`,
          decayScore: `${decayScore}/100`,
          priorityTier,
          estimatedShelfLife: `${estimatedShelfLifeHours} hours remaining`,
          status: decayScore > 75 ? "CRITICAL_SPOILAGE_RISK" : "STABLE",
        };
      }
      case "divert_shipment": {
        const truckId = String(args.truckId || "TN-45-A-9012");
        const targetFacility = String(args.targetFacility || "Mumbai Hub");
        const facility = COLD_STORAGE_FACILITIES[targetFacility];

        return {
          status: "REROUTE_SUCCESSFUL",
          truckId,
          newDestination: targetFacility,
          targetCapacityFilled: facility ? `${facility.capacityFilled}%` : "Unknown",
          timestamp: new Date().toISOString(),
        };
      }
      case "trigger_flash_clearance": {
        const batchId = String(args.batchId || "AYU-TOM-8821");
        const decayScore = Number(args.decayScore || 78);
        const discountPercentage = decayScore >= 75 ? 50 : decayScore >= 50 ? 30 : 15;

        return {
          action: "FLASH_SALE_TRIGGERED",
          batchId,
          discountApplied: `${discountPercentage}% OFF`,
          portalUpdate: "Active on consumer mandi catalog",
          revenueRecoveryExpected: "High",
        };
      }
      default:
        throw new Error(`Unknown MCP Tool: ${name}`);
    }
  };

  const handleSend = (overrideQuery?: string, toolPreset?: { name: string; args: Record<string, any> }) => {
    const query = overrideQuery || input;
    if (!query.trim() && !toolPreset) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!overrideQuery) setInput("");
    setLoading(true);

    setTimeout(() => {
      let toolCall: ToolResult | undefined;
      let replyText = "";
      const lower = query.toLowerCase();

      if (toolPreset) {
        const res = executeMCPTool(toolPreset.name, toolPreset.args);
        toolCall = { toolName: toolPreset.name, args: toolPreset.args, result: res };
        replyText = `Executed MCP tool \`${toolPreset.name}\` successfully. Telemetry response returned below:`;
      } else if (lower.includes("surplus") || lower.includes("ariyalur") || lower.includes("nashik") || lower.includes("gwalior")) {
        const dist = lower.includes("nashik") ? "Nashik" : lower.includes("gwalior") ? "Gwalior" : lower.includes("perambalur") ? "Perambalur" : "Ariyalur";
        const args = { district: dist };
        const res = executeMCPTool("check_regional_surplus", args);
        toolCall = { toolName: "check_regional_surplus", args, result: res };
        replyText = `🔍 **MCP GIS Surplus Scan**: District \`${dist}\` shows **+${res.surplusPercentage || 0}%** overproduction. Recommendation: **${res.actionNeeded || "Standard"}**.`;
      } else if (lower.includes("spoilage") || lower.includes("decay") || lower.includes("temp") || lower.includes("shelf")) {
        const args = { crop: lower.includes("mango") ? "Mango" : "Tomato", ambientTemperature: 36, transitDurationHours: 32 };
        const res = executeMCPTool("predict_spoilage_velocity", args);
        toolCall = { toolName: "predict_spoilage_velocity", args, result: res };
        replyText = `🌡️ **MCP Spoilage Prediction**: Decay Index is **${res.decayScore}**. Assigned **${res.priorityTier}** with **${res.estimatedShelfLife}**.`;
      } else if (lower.includes("divert") || lower.includes("reroute") || lower.includes("truck")) {
        const args = { truckId: "TN-45-A-9012", targetFacility: "Mumbai Hub", reason: "Prevent heat stress spoilage" };
        const res = executeMCPTool("divert_shipment", args);
        toolCall = { toolName: "divert_shipment", args, result: res };
        replyText = `🚚 **MCP Reroute Execution**: Truck \`TN-45-A-9012\` successfully diverted to **Mumbai Hub** (Capacity: ${res.targetCapacityFilled}).`;
      } else if (lower.includes("discount") || lower.includes("clearance") || lower.includes("flash") || lower.includes("markdown")) {
        const args = { batchId: "AYU-TOM-8821", decayScore: 82 };
        const res = executeMCPTool("trigger_flash_clearance", args);
        toolCall = { toolName: "trigger_flash_clearance", args, result: res };
        replyText = `⚡ **MCP Flash Clearance**: Automated **${res.discountApplied}** discount published to consumer portals for Batch \`${res.batchId}\`.`;
      } else {
        replyText = `🤖 **AyuTrace MCP Engine**: I can invoke tools like \`check_regional_surplus\`, \`predict_spoilage_velocity\`, \`divert_shipment\`, and \`trigger_flash_clearance\`. Use the tabs above to manage Web3 Soroban Smart Contracts!`;
      }

      const agentMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "agent",
        text: replyText,
        toolCall,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, agentMsg]);
      setLoading(false);
    }, 500);
  };

  return (
    <>
      {/* Trigger Floating Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 group flex items-center gap-3 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white p-3.5 rounded-full shadow-2xl transition-all duration-300 transform hover:scale-105 hover:shadow-emerald-500/25 border border-emerald-400/40"
          aria-label="Open AyuTrace Web3 AI Agent"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-6 h-6 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-300 border-2 border-emerald-700 animate-ping" />
          </div>
          <span className="font-semibold text-xs tracking-wide pr-1 hidden sm:inline-block">
            Web3 AI Agent Hub
          </span>
          <Badge className="bg-emerald-950/80 text-emerald-300 text-[10px] border-emerald-400/40 px-1.5 py-0.5">
            Soroban
          </Badge>
        </button>
      )}

      {/* Floating Web3 Hub Window */}
      {isOpen && (
        <div
          className={`fixed z-50 transition-all duration-300 flex flex-col bg-card/95 backdrop-blur-2xl border border-emerald-500/40 rounded-2xl shadow-2xl overflow-hidden ${
            isExpanded
              ? "bottom-4 right-4 left-4 sm:left-auto sm:w-[720px] h-[88vh]"
              : "bottom-6 right-6 w-[480px] max-w-[calc(100vw-2rem)] h-[640px] max-h-[85vh]"
          }`}
        >
          {/* Header */}
          <div className="bg-emerald-950/90 border-b border-emerald-500/30 p-3.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-inner">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-foreground flex items-center gap-2">
                  AyuTrace Web3 & Soroban Hub
                  <span className="flex items-center gap-1 text-[10px] font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Testnet Live
                  </span>
                </h3>
                <p className="text-[10px] text-muted-foreground font-mono">
                  Contract A (Registry) ↔ Contract B (Tracker)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Navigation Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-emerald-950/40 border-b border-emerald-500/20 px-2 pt-1 shrink-0">
              <TabsList className="bg-transparent h-9 gap-1 grid grid-cols-4 p-0">
                <TabsTrigger
                  value="mcp"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-[11px] h-7 px-1.5 gap-1"
                >
                  <Cpu className="w-3 h-3" /> AI & MCP
                </TabsTrigger>
                <TabsTrigger
                  value="wallet"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-[11px] h-7 px-1.5 gap-1"
                >
                  <Wallet className="w-3 h-3" /> Wallet
                </TabsTrigger>
                <TabsTrigger
                  value="contracts"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-[11px] h-7 px-1.5 gap-1"
                >
                  <Layers className="w-3 h-3" /> Contracts
                </TabsTrigger>
                <TabsTrigger
                  value="events"
                  className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-[11px] h-7 px-1.5 gap-1"
                >
                  <Radio className="w-3 h-3" /> Events
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB 1: AI & MCP Logistics */}
            <TabsContent value="mcp" className="flex-1 flex flex-col overflow-hidden m-0 p-0">
              {/* Quick MCP Chips */}
              <div className="bg-emerald-950/30 border-b border-border/40 p-2 flex items-center gap-1.5 overflow-x-auto custom-scrollbar shrink-0">
                <span className="text-[10px] font-semibold text-emerald-400 shrink-0 flex items-center gap-1 px-1">
                  <Zap className="w-3 h-3" /> Quick Tools:
                </span>
                <button
                  onClick={() =>
                    handleSend("Check regional surplus for Ariyalur", {
                      name: "check_regional_surplus",
                      args: { district: "Ariyalur" },
                    })
                  }
                  className="text-[11px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg px-2 py-1 transition-all shrink-0"
                >
                  📊 Surplus
                </button>
                <button
                  onClick={() =>
                    handleSend("Predict spoilage velocity for Tomato at 36°C for 32 hrs", {
                      name: "predict_spoilage_velocity",
                      args: { crop: "Tomato", ambientTemperature: 36, transitDurationHours: 32 },
                    })
                  }
                  className="text-[11px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg px-2 py-1 transition-all shrink-0"
                >
                  🌡️ Spoilage
                </button>
                <button
                  onClick={() =>
                    handleSend("Divert shipment for truck TN-45-A-9012 to Mumbai Hub", {
                      name: "divert_shipment",
                      args: { truckId: "TN-45-A-9012", targetFacility: "Mumbai Hub" },
                    })
                  }
                  className="text-[11px] bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded-lg px-2 py-1 transition-all shrink-0"
                >
                  🚚 Reroute
                </button>
                <button
                  onClick={() =>
                    handleSend("Trigger flash clearance for batch AYU-TOM-8821", {
                      name: "trigger_flash_clearance",
                      args: { batchId: "AYU-TOM-8821", decayScore: 82 },
                    })
                  }
                  className="text-[11px] bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-lg px-2 py-1 transition-all shrink-0"
                >
                  ⚡ Flash Discount
                </button>
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                {messages.map((m) => (
                  <div key={m.id} className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}>
                    <div
                      className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                        m.sender === "user"
                          ? "bg-emerald-600 text-white rounded-tr-none"
                          : "bg-muted/90 border border-emerald-500/20 text-foreground rounded-tl-none"
                      }`}
                    >
                      <p className="whitespace-pre-line">{m.text}</p>
                      {m.toolCall && (
                        <div className="mt-2.5 bg-black/40 border border-emerald-500/30 rounded-lg p-2.5 space-y-1.5 font-mono text-[11px]">
                          <div className="flex items-center justify-between text-emerald-400 font-bold pb-1 border-b border-emerald-500/20">
                            <span className="flex items-center gap-1.5">
                              <Terminal className="w-3.5 h-3.5" />
                              Tool: {m.toolCall.toolName}
                            </span>
                            <Badge variant="outline" className="text-[9px] bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                              SUCCESS
                            </Badge>
                          </div>
                          <pre className="bg-emerald-950/60 p-2 rounded text-[10px] text-emerald-300 overflow-x-auto border border-emerald-500/20">
                            {JSON.stringify(m.toolCall.result, null, 2)}
                          </pre>
                        </div>
                      )}
                      <span className="text-[9px] opacity-60 block mt-1 text-right">{m.timestamp}</span>
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-emerald-400 italic bg-emerald-950/40 p-2.5 rounded-lg border border-emerald-500/20 max-w-[75%]">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Executing tool call...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Footer Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="p-2.5 bg-emerald-950/40 border-t border-emerald-500/20 flex gap-2 shrink-0"
              >
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask MCP Agent or run telemetry..."
                  className="flex-1 bg-background/80 text-xs h-9 focus-visible:ring-emerald-500"
                />
                <Button type="submit" disabled={loading || !input.trim()} size="sm" className="bg-emerald-600 hover:bg-emerald-700 h-9 px-3">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </form>
            </TabsContent>

            {/* TAB 2: Web3 Wallet Connection */}
            <TabsContent value="wallet" className="flex-1 overflow-y-auto p-4 space-y-4 m-0">
              <div className="space-y-1">
                <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-emerald-400" /> Stellar Soroban Wallet Manager
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Connect Freighter extension or generate an auto-funded Stellar Testnet Keypair via Friendbot.
                </p>
              </div>

              {walletError && (
                <div className="bg-destructive/10 border border-destructive/30 p-2.5 rounded-lg text-xs text-destructive flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  <span>{walletError}</span>
                </div>
              )}

              {/* Connected State Card */}
              {wallet.isConnected ? (
                <div className="bg-emerald-950/60 border border-emerald-500/40 rounded-xl p-3.5 space-y-3 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4" /> Connected ({wallet.walletType === "freighter" ? "Freighter" : "Testnet Keypair"})
                    </span>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40">
                      {STELLAR_CONFIG.network}
                    </Badge>
                  </div>

                  <div className="space-y-1 text-[11px]">
                    <div className="text-muted-foreground">Public Key:</div>
                    <div className="bg-black/40 p-2 rounded text-emerald-300 text-[10px] break-all border border-emerald-500/20">
                      {wallet.publicKey}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-muted-foreground text-[11px]">Testnet Balance:</span>
                    <span className="font-bold text-emerald-300 text-xs">{wallet.balanceXLM}</span>
                  </div>

                  {wallet.secretKey && (
                    <div className="space-y-1 pt-1 border-t border-emerald-500/20">
                      <div className="text-amber-400 text-[10px] flex items-center gap-1">
                        <Key className="w-3 h-3" /> Secret Key (Testnet Sandbox):
                      </div>
                      <div className="bg-black/50 p-2 rounded text-amber-300 text-[9px] break-all border border-amber-500/30">
                        {wallet.secretKey}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fundWithFriendbot(wallet.publicKey!)}
                      className="flex-1 text-[11px] h-8 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Refill Friendbot
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setWallet({ isConnected: false, publicKey: null, walletType: null, balanceXLM: "0 XLM" })}
                      className="text-[11px] h-8"
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Option 1: Freighter */}
                  <div className="bg-card border border-emerald-500/20 rounded-xl p-3.5 hover:border-emerald-500/40 transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-foreground flex items-center gap-2">
                        <Wallet className="w-4 h-4 text-teal-400" /> Option A: Freighter Extension
                      </span>
                      <Badge variant="outline" className="text-[9px]">Recommended</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Connect your Freighter browser wallet extension for secure Stellar transaction signing.
                    </p>
                    <Button
                      onClick={handleConnectFreighter}
                      disabled={walletLoading}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 h-8 text-xs gap-1.5"
                    >
                      {walletLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <LinkIcon className="w-3.5 h-3.5" />}
                      Connect Freighter Wallet
                    </Button>
                  </div>

                  {/* Option 2: Testnet Keypair */}
                  <div className="bg-card border border-emerald-500/20 rounded-xl p-3.5 hover:border-emerald-500/40 transition-all space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-xs text-foreground flex items-center gap-2">
                        <Zap className="w-4 h-4 text-emerald-400" /> Option B: Instant Keypair + Friendbot
                      </span>
                      <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400">10,000 XLM</Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Generate an ephemeral Stellar keypair and automatically request testnet funds from Friendbot.
                    </p>
                    <Button
                      onClick={handleGenerateKeypair}
                      disabled={walletLoading}
                      variant="outline"
                      className="w-full border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/10 h-8 text-xs gap-1.5"
                    >
                      {walletLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <PlusCircle className="w-3.5 h-3.5" />}
                      Generate & Auto-Fund Keypair
                    </Button>
                  </div>
                </div>
              )}
            </TabsContent>

            {/* TAB 3: Soroban Contract Operations */}
            <TabsContent value="contracts" className="flex-1 overflow-y-auto p-4 space-y-4 m-0 custom-scrollbar">
              <div className="space-y-1">
                <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-400" /> Soroban Inter-Contract Operations
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Execute batch creations with Contract A (<code className="text-emerald-400">TraceLinkRegistry</code>) & Contract B (<code className="text-emerald-400">TraceLinkTracker</code>).
                </p>
              </div>

              {/* Form 1: Create Item with Inter-Contract Call */}
              <form onSubmit={handleCreateContractItem} className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
                  <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5">
                    <PlusCircle className="w-3.5 h-3.5" /> Register Batch (Inter-Contract)
                  </span>
                  <Badge variant="outline" className="text-[9px] border-emerald-500/40 text-emerald-400">
                    Contract A ↔ B
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Batch ID Symbol</label>
                    <Input
                      value={createItemForm.itemId}
                      onChange={(e) => setCreateItemForm({ ...createItemForm, itemId: e.target.value })}
                      className="h-7 text-xs bg-background/60"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Item Name</label>
                    <Input
                      value={createItemForm.name}
                      onChange={(e) => setCreateItemForm({ ...createItemForm, name: e.target.value })}
                      className="h-7 text-xs bg-background/60"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Category</label>
                    <Input
                      value={createItemForm.category}
                      onChange={(e) => setCreateItemForm({ ...createItemForm, category: e.target.value })}
                      className="h-7 text-xs bg-background/60"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Origin Location</label>
                    <Input
                      value={createItemForm.origin}
                      onChange={(e) => setCreateItemForm({ ...createItemForm, origin: e.target.value })}
                      className="h-7 text-xs bg-background/60"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={contractTxLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 h-8 text-xs gap-1.5"
                >
                  {contractTxLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5" />}
                  Execute Inter-Contract Batch Registration
                </Button>
              </form>

              {/* Form 2: Add Checkpoint Verified */}
              <form onSubmit={handleAddCheckpoint} className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-1.5">
                  <span className="font-bold text-xs text-teal-300 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5" /> Append Verified Checkpoint
                  </span>
                  <Badge variant="outline" className="text-[9px] border-teal-500/40 text-teal-400">
                    Role Auth Checked
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Target Batch ID</label>
                    <Input
                      value={checkpointForm.itemId}
                      onChange={(e) => setCheckpointForm({ ...checkpointForm, itemId: e.target.value })}
                      className="h-7 text-xs bg-background/60"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Location</label>
                    <Input
                      value={checkpointForm.location}
                      onChange={(e) => setCheckpointForm({ ...checkpointForm, location: e.target.value })}
                      className="h-7 text-xs bg-background/60"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Status Code</label>
                    <Input
                      value={checkpointForm.status}
                      onChange={(e) => setCheckpointForm({ ...checkpointForm, status: e.target.value })}
                      className="h-7 text-xs bg-background/60"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Notes</label>
                    <Input
                      value={checkpointForm.notes}
                      onChange={(e) => setCheckpointForm({ ...checkpointForm, notes: e.target.value })}
                      className="h-7 text-xs bg-background/60"
                      required
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={contractTxLoading}
                  variant="outline"
                  className="w-full border-teal-500/40 text-teal-300 hover:bg-teal-500/10 h-8 text-xs gap-1.5"
                >
                  {contractTxLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                  Submit Verified Checkpoint
                </Button>
              </form>

              {/* Transaction Result Banner */}
              {lastTxResult && (
                <div className="bg-black/60 border border-emerald-500/40 rounded-xl p-3 space-y-2 font-mono text-[11px]">
                  <div className="text-emerald-400 font-bold flex items-center justify-between border-b border-emerald-500/20 pb-1">
                    <span>⚡ Transaction Submitted & Confirmed</span>
                    <Badge variant="outline" className="text-[9px] bg-emerald-500/20 text-emerald-300">
                      SUCCESS
                    </Badge>
                  </div>
                  <div>
                    <strong className="text-muted-foreground">Tx Hash:</strong>{" "}
                    <span className="text-emerald-300 text-[10px] break-all">{lastTxResult.txHash}</span>
                  </div>
                  {lastTxResult.interContractCalls && (
                    <div className="text-[10px] text-teal-300 bg-emerald-950/80 p-2 rounded border border-emerald-500/20">
                      <strong>Inter-Contract Invocation:</strong>
                      <br />
                      {lastTxResult.interContractCalls.methodCalled}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* TAB 4: Architecture Diagram & Live Event Stream */}
            <TabsContent value="events" className="flex-1 overflow-y-auto p-4 space-y-4 m-0 custom-scrollbar">
              <div className="space-y-1">
                <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                  <Radio className="w-4 h-4 text-emerald-400" /> On-Chain Soroban Event Stream
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  Real-time events emitted by Contract A (<code className="text-emerald-400">TraceLinkRegistry</code>) & Contract B (<code className="text-emerald-400">TraceLinkTracker</code>).
                </p>
              </div>

              {/* Inter-Contract Visual Flow Diagram */}
              <div className="bg-emerald-950/50 border border-emerald-500/30 rounded-xl p-3 space-y-2 text-xs">
                <div className="text-[10px] font-semibold text-emerald-400 flex items-center justify-between">
                  <span>INTER-CONTRACT ARCHITECTURE</span>
                  <span className="text-muted-foreground font-mono">Testnet RPC</span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[10px] font-mono bg-black/40 p-2 rounded border border-emerald-500/20">
                  <div className="text-center">
                    <div className="text-emerald-300 font-bold">Contract B</div>
                    <div className="text-[9px] text-muted-foreground">TraceLinkTracker</div>
                  </div>
                  <div className="text-emerald-400 font-bold animate-pulse">━━ register_batch ━━►</div>
                  <div className="text-center">
                    <div className="text-teal-300 font-bold">Contract A</div>
                    <div className="text-[9px] text-muted-foreground">TraceLinkRegistry</div>
                  </div>
                </div>
              </div>

              {/* Live Events List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground px-1">
                  <span>Streamed Events ({events.length})</span>
                  <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    Polling RPC
                  </span>
                </div>

                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      className="bg-black/50 border border-emerald-500/25 rounded-lg p-2.5 space-y-1 font-mono text-[11px]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                          <Activity className="w-3 h-3" /> Topic: <code className="text-white">{evt.topic}</code>
                        </span>
                        <span className="text-[9px] text-muted-foreground">Ledger #{evt.ledger}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        Contract: {evt.contractId}
                      </div>
                      <pre className="bg-emerald-950/60 p-1.5 rounded text-[10px] text-emerald-300 overflow-x-auto border border-emerald-500/20">
                        {JSON.stringify(evt.data)}
                      </pre>
                      <div className="text-[9px] text-right text-muted-foreground opacity-60">
                        {evt.timestamp}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </>
  );
}
