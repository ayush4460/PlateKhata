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
  item_name: string;
  quantity: number;
  price: number;
  unit_price?: number; // Added to match API
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
  session_id?: string; // Added to match API
  order_status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';  // Added 'served'
  payment_status: 'Pending' | 'Approved';
  payment_method?: 'Cash' | 'UPI' | 'Card' | 'Other';
  created_at: string; // ISO date string
  items: BackendOrderItem[];
  order_type: 'regular' | 'addon';
}

// Past order structure used in user account
export interface PastOrder {
  id: string;
  orderNumber: string;
  userName: string;
  userPhone: string;
  tableNumber: string;
  date: string;
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
  sessionId?: string;
}

// Kitchen-facing order)
export interface KitchenOrder {
  id: string;
  orderNumber: string;
  table: string;
  items: {
    name: string;
    quantity: number;
    specialInstructions: string | null;
    category: string;
  }[];
  time: string;
  status: 'confirmed' | 'preparing' | 'ready';
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

// TableStatus
export interface TableStatus {
  id: number;
  tableNumber: string;
  capacity: number;
  qrCodeUrl: string;
  isAvailable: boolean;
  status: 'Empty' | 'Occupied';
}



export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'kitchen';
  restaurantId?: string | number; // Added restaurantId
  fullName?: string;
  username?: string;
}
