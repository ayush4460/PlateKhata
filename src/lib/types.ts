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
  item_category: string;
}

// The backend's raw Order structure
export interface BackendOrder {
  order_id: number;
  order_number: string;
  table_id: number;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  payment_status: 'Pending' | 'Approved';
  payment_method?: 'Cash' | 'UPI' | 'Card' | 'Other';
  created_at: string; // ISO date string
  items: BackendOrderItem[];
  order_type: 'regular' | 'addon';
}

// Customer-facing order for "My Orders" page
export interface PastOrder {
  id: string; // The order's ID
  orderNumber: string;
  userName: string;
  userPhone: string;
  tableNumber: string;
  date: string; // ISO date string
  status: 'Pending' | 'Confirmed' | 'Preparing' | 'Ready' | 'Served' | 'Completed' | 'Cancelled';
  paymentStatus: 'Pending' | 'Approved';
  paymentMethod?: string;
  total: number;
  subtotal: number;
  tax: number;
  discount: number;
  items: {
    id: string;
    name: string;
    quantity: number;
    price: number;
  }[];
  orderType?: 'regular' | 'addon';
}

// Kitchen-facing order)
export interface KitchenOrder {
  id: string; // The order's ID
  orderNumber: string;
  table: string;
  items: {
    name: string;
    quantity: number;
    specialInstructions: string | null;
    category: string;
  }[];
  time: string; // e.g., "Just now" or "10:32 AM"
  status: 'confirmed' | 'preparing' | 'ready'; // Backend status
  created_at: string;
  orderType: 'regular' | 'addon';
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

// --- TableStatus ---
export interface TableStatus {
  id: number; // Corresponds to table_id from backend
  tableNumber: string; // Corresponds to table_number from backend
  capacity: number;
  qrCodeUrl: string; // Corresponds to qr_code_url from backend
  isAvailable: boolean; // Corresponds to is_available from backend
  status: 'Empty' | 'Occupied';
}


export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';