export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stockQty?: number;
  stock_qty?: number;
  description?: string;
  image?: string;
}

export interface Herb {
  id: string;
  name: string;
  botanicalName?: string;
  origin?: string;
  status?: string;
  activeCompounds?: string[];
}
