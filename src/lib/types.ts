// src/lib/types.ts

// The base menu item (simplified to match your app)
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: {
    url: string;
    hint: string;
  };
  category: string;
  isAvailable: boolean;
  isVegetarian: boolean;
  preparationTime: number | null;
  imageId?: string;
}

// An item when it is in the cart
export interface CartItem extends MenuItem {
  quantity: number;
  specialInstructions?: string;
}

// The backend's raw Order Item structure
export interface BackendOrderItem {
  item_id: number;
  name: string;
  quantity: number;
  price: number;
  special_instructions: string | null;
}

// The backend's raw Order structure
export interface BackendOrder {
  order_id: number;
  table_id: number;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  payment_status: 'Pending' | 'Approved';
  created_at: string; // ISO date string
  items: BackendOrderItem[];
}

// Customer-facing order for "My Orders" page
export interface PastOrder {
  id: string; // The order's ID
  userName: string;
  userPhone: string;
  tableNumber: string;
  date: string; // ISO date string
  status: 'Pending' | 'Confirmed' | 'Preparing' | 'Ready' | 'Served' | 'Completed' | 'Cancelled';
  paymentStatus: 'Pending' | 'Approved';
  total: number;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
}

// Kitchen-facing order (what the KitchenPage component expects)
export interface KitchenOrder {
  id: string; // The order's ID
  table: string;
  items: {
    name: string;
    quantity: number;
    specialInstructions: string | null;
  }[];
  time: string; // e.g., "Just now" or "10:32 AM"
  status: 'confirmed' | 'preparing' | 'ready'; // Backend status
}

// The state structure for the kitchen page
export interface KitchenOrdersState {
  new: KitchenOrder[];
  'in-progress': KitchenOrder[];
  completed: KitchenOrder[];
}

export interface SalesData {
  name: string;
  sales: number;
}

// --- UPDATED TableStatus Type ---
export interface TableStatus {
  id: number; // Corresponds to table_id from backend
  tableNumber: string; // Corresponds to table_number from backend
  capacity: number;
  qrCodeUrl: string; // Corresponds to qr_code_url from backend
  isAvailable: boolean; // Corresponds to is_available from backend
  status: 'Empty' | 'Occupied' | 'Needs Cleaning';
}


export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';