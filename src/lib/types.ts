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
  categoryId?: number; // Added for dynamic categories support
  isAvailable: boolean;
  isVegetarian: boolean;
  dietaryType?: 'veg' | 'non_veg' | 'eggitarian'; // Added
  preparationTime: number | null;
  imageId?: string;
  hasSpiceLevels?: boolean; // Added
}

// An item when it is in the cart
export interface CartItem extends MenuItem {
  quantity: number;
  specialInstructions?: string;
  spiceLevel?: string; // Added
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
  spice_level?: string | null; // Added
}

// The backend's raw Order structure
export interface BackendOrder {
  order_id: number;
  order_number: string;
  table_id: number;
  table_number?: string;
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
  created_at: number; // Epoch timestamp (BIGINT from DB)
  items: BackendOrderItem[];
  order_type: 'regular' | 'addon' | 'online';
  external_platform?: string; // zomaoto, swiggy
  external_outlet_id?: string;
}

// Past order structure used in user account
export interface PastOrder {
  id: string;
  orderNumber: string;
  userName: string;
  userPhone: string;
  tableNumber: string;
  tableId: string; // Added for precise filtering
  date: number; // Epoch timestamp
  status: 'Pending' | 'Confirmed' | 'Preparing' | 'Ready' | 'Served' | 'Completed' | 'Cancelled';
  paymentStatus: 'Pending' | 'Approved' | 'Requested';
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
    spiceLevel?: string | null; // Added
  }[];
  orderType?: 'regular' | 'addon' | 'online';
  sessionId?: string;
  platform?: string; // Added for UI
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
    spiceLevel?: string | null; // Added
  }[];
  time: string;
  status: 'confirmed' | 'preparing' | 'ready';
  created_at: number;
  orderType: 'regular' | 'addon' | 'online';
  platform?: string; // Added
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
  status: 'Empty' | 'Occupied' | 'Paid & Occupied';
  totalAmount?: number;
  unpaidAmount?: number;
  occupiedSince?: number;
  customerName?: string;
  customerPhone?: string;
}

export interface SellingItem {
  item_id: number;
  item_name: string;
  total_quantity: string | number;
  total_revenue: string | number;
}

export interface AdvancedAnalytics {
  topSelling: SellingItem[];
  revenueSeries: {
    date: number;
    revenue: number;
  }[];
}

export interface PaymentStats {
  name: string;
  value: number;
  count: number;
}



export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly' | 'all-time';

export interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'kitchen';
  restaurantId?: string | number; // Added restaurantId
  restaurantSlug?: string; // Added restaurantSlug
  fullName?: string;
  username?: string;
}
// Category definition
export interface Category {
  id: number; // mapped from category_id
  restaurant_id: number;
  name: string;
  display_order: number;
  is_active: boolean;
  created_at?: number;
}

export type CreateCategoryDTO = Pick<Category, 'name' | 'display_order'> & { restaurantId?: number };
export type UpdateCategoryDTO = Partial<Omit<Category, 'id' | 'restaurant_id' | 'created_at'>>;
