export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export function useGetFarmerDashboard() {
  return {
    data: {
      totalHerbs: 24,
      totalRevenue: 145000,
      activeOrders: 5,
      pendingShipments: 2,
      topHerbs: [
        { id: "herb-1", name: "Ashwagandha Organic", region: "Neemuch, MP", currentStock: 450 },
        { id: "herb-2", name: "Tulsi Leaves", region: "Kerala", currentStock: 280 },
      ],
      recentOrders: [
        { id: "ORD-101", customerName: "AyuLab Pharmacy", date: "2026-08-28", status: "DELIVERED", amount: 12000 },
        { id: "ORD-102", customerName: "Herbal Care Ltd", date: "2026-08-27", status: "IN_TRANSIT", amount: 4500 },
      ],
    },
    isLoading: false,
    error: null,
  };
}

export function useGetConsumerDashboard() {
  return {
    data: {
      totalOrders: 12,
      activeOrders: 2,
      totalSpent: 8400,
      recentOrders: [
        { id: "ORD-101", product: "Ashwagandha Extract", status: "DELIVERED", date: "2026-08-25", amount: "₹1,200" },
        { id: "ORD-102", product: "Organic Tulsi Powder", status: "IN_TRANSIT", date: "2026-08-27", amount: "₹450" },
      ],
      recommendedProducts: [
        { id: "p1", name: "Shatavari Powder", category: "Vitality", price: 650 },
        { id: "p2", name: "Brahmi Syrup", category: "Memory", price: 420 },
      ],
    },
    isLoading: false,
    error: null,
  };
}

export function useGetSellerDashboard() {
  return {
    data: {
      totalProducts: 45,
      totalRevenue: 380000,
      totalOrders: 184,
      activeListings: 42,
      topProducts: [
        { id: "p1", name: "Ashwagandha Extract", sales: 120, revenue: "₹1,44,000" },
        { id: "p2", name: "Organic Tulsi Tea", sales: 85, revenue: "₹38,250" },
      ],
    },
    isLoading: false,
    error: null,
  };
}

export function useListHerbs(params?: any, options?: any) {
  const herbs = [
    { id: "herb-1", name: "Ashwagandha", botanicalName: "Withania somnifera", category: "Adaptogen", status: "Verified" },
    { id: "herb-2", name: "Tulsi", botanicalName: "Ocimum sanctum", category: "Immunity", status: "Verified" },
    { id: "herb-3", name: "Shatavari", botanicalName: "Asparagus racemosus", category: "Vitality", status: "Verified" },
  ];
  return {
    data: { herbs },
    isLoading: false,
  };
}

export function useGetHerb(id: any, options?: any) {
  return {
    data: {
      id: String(id),
      name: "Organic Ashwagandha Root",
      botanicalName: "Withania somnifera",
      description: "Premium grade adaptogenic herb sourced from certified organic farms in Madhya Pradesh.",
      origin: "Neemuch, Madhya Pradesh",
      region: "Central India",
      harvestDate: "2026-08-15",
      qualityGrade: "A+",
      activeCompounds: ["Withanolide A", "Withaferin A"],
      uses: ["Stress relief", "Immunity boost", "Vitality"],
      benefits: ["Lowers cortisol", "Improves sleep", "Increases stamina"],
      harvestSeason: "Winter (Oct-Feb)",
      pricePerKg: "₹1,200 / kg",
      currentStock: "450 kg",
      trendScore: "96.4%",
    },
    isLoading: false,
  };
}

export function useGetSupplyChainJourney(id: any, options?: any) {
  return {
    data: {
      batchId: String(id),
      steps: [
        { id: "1", title: "Harvested", location: "Organic Farm, Neemuch", timestamp: "2026-08-15 08:00 AM", status: "Completed", notes: "Soil moisture 14%" },
        { id: "2", title: "Quality Check & Lab Test", location: "AyuLab Gwalior", timestamp: "2026-08-17 02:30 PM", status: "Completed", notes: "Purity 99.2%" },
        { id: "3", title: "Soroban Inter-Contract Batch Registration", location: "Stellar Testnet", timestamp: "2026-08-18 10:15 AM", status: "Verified", notes: "Contract A & Contract B synced" },
      ],
    },
    isLoading: false,
  };
}

export function useListOrders(params?: any, options?: any) {
  const orders = [
    { id: "ORD-9901", date: "2026-08-25", items: "Ashwagandha Extract (500g)", amount: "₹1,200", status: "DELIVERED" },
    { id: "ORD-9902", date: "2026-08-27", items: "Tulsi Tea Organic Pack", amount: "₹450", status: "IN_TRANSIT" },
  ];
  return {
    data: { orders },
    isLoading: false,
  };
}

export function useTrackOrder(id: any, options?: any) {
  return {
    data: {
      orderId: String(id),
      herbName: "Ashwagandha Extract",
      carrier: "AyuExpress ColdChain",
      trackingNumber: "AYU-EXP-88912",
      status: "IN_TRANSIT",
      currentStage: "In Transit - Transport Hub",
      estimatedDelivery: "2026-08-30",
      steps: [
        { id: "1", stage: "Dispatched from Mandi", location: "Gwalior APMC", timestamp: "2026-08-27 10:00 AM", completed: true },
        { id: "2", stage: "Cold Storage Verification", location: "Indore Cold Hub", timestamp: "2026-08-28 01:15 PM", completed: true },
        { id: "3", stage: "Final Mile Delivery", location: "Consumer Hub", timestamp: "2026-08-29 09:00 AM", completed: false },
      ],
    },
    isLoading: false,
  };
}

export function getTrackOrderQueryKey(id: any) {
  return ["track-order", String(id)];
}
