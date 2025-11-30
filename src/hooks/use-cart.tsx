// src/hooks/use-cart.tsx
'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
  useRef
} from 'react';
import type {
  CartItem,
  MenuItem,
  PastOrder,
  KitchenOrder,
  KitchenOrdersState,
  SalesData,
  TableStatus,
  AnalyticsPeriod,
  BackendOrder,
} from '@/lib/types';
import { useToast } from './use-toast';
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  format,
  eachDayOfInterval,
  startOfToday,
  endOfToday,
  formatDistanceToNow,
  parseISO,
} from 'date-fns';
import { io, Socket } from 'socket.io-client';
import { useRouter } from 'next/navigation';
import { QRCodeCanvas } from 'qrcode.react';

// --- API & Socket Configuration ---
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('/api/v1', '');

type KitchenStatus = 'new' | 'in-progress' | 'completed';

// Analytics data structure
interface AnalyticsData {
  totalRevenue: number;
  revenueChangeText: string;
  newOrders: number;
  ordersChangeText: string;
  avgOrderValue: number;
  avgValueChangeText: string;
}

// Define the shape of the context
interface CartContextType {
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  removeFromCart: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  placeOrder: (
    total: number,
    customer: { name: string; phone: string; email?: string; }
  ) => Promise<boolean>;
  repeatOrder: (orderId: string) => Promise<void>;
  pastOrders: PastOrder[];
  kitchenOrders: KitchenOrdersState;
  updateKitchenOrderStatus: (orderId: string, from: KitchenStatus, to: KitchenStatus) => void;
  requestPayment: (orderId: string, method: 'Cash' | 'UPI') => Promise<void>;
  approvePayment: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
  taxRate: number;
  discountRate: number;
  updateSettings: (tax: number, discount: number) => Promise<void>;
  menuItems: MenuItem[];
  setMenuItems: (items: MenuItem[]) => void;
  analytics: AnalyticsData;
  salesData: SalesData[];
  isCartLoading: boolean;
  tableNumber: string | null;
  customerDetails: { name: string; phone: string; } | null;
  setTable: (table: string) => void;
  tableStatuses: TableStatus[];
  createTable: (tableNumber: string, capacity: number) => Promise<boolean>;
  clearTableSession: (tableId: number) => Promise<void>;
  analyticsPeriod: AnalyticsPeriod;
  setAnalyticsPeriod: (period: AnalyticsPeriod) => void;
  connectSocket: () => void;
}

// Create the context
const CartContext = createContext<CartContextType | undefined>(undefined);

// --- LocalStorage Helpers ---
const safeJsonParse = <T,>(jsonString: string | null): T | null => {
  if (typeof window === 'undefined' || !jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to parse JSON", error);
    return null;
  }
};

const writeToStorage = <T,>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to write to localStorage: ${key}`, error);
  }
};

// --- Auth Helper ---
const authHeaders =  (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const headers: Record<string, string> = {};

  const adminToken = localStorage.getItem('accessToken');
  if (adminToken) headers['Authorization'] = `Bearer ${adminToken}`;

  const sessionToken = localStorage.getItem('session_token');
  if (sessionToken) headers['x-session-token'] = sessionToken;
  return headers;
};

// Helper to get role from storage safely
const getStoredRole = () => {
    if (typeof window === 'undefined') return null;
    try {
        const user = JSON.parse(localStorage.getItem('adminUser') || '{}');
        return user.role || null;
    } catch { return null; }
};

const hasAuthToken = () => typeof window !== 'undefined' && !!localStorage.getItem('accessToken');

// --- Data Mapping Helpers ---
const mapBackendOrderToPastOrder = (order: BackendOrder): PastOrder => ({
  id: String(order.order_id),
  orderNumber: order.order_number,
  userName: order.customer_name,
  userPhone: order.customer_phone,
  tableNumber: String(order.table_id),
  date: order.created_at,
  status: order.order_status,
  paymentStatus: order.payment_status || 'Pending',
  paymentMethod: order.payment_method,
  total: parseFloat(String(order.total_amount || '0')),
  subtotal: parseFloat(String(order.subtotal || '0')),
  tax: parseFloat(String(order.tax_amount || '0')),
  discount: parseFloat(String(order.discount_amount || '0')),
  orderType: order.order_type,
  session_id: order.session_id,
  items: (order.items || []).map(item => ({
    id: String(item.item_id),
    name: item.item_name || 'N/A',
    quantity: item.quantity,
    price: parseFloat(String(item.unit_price || item.price || '0')),
    category: item.item_category
  })),
});

const mapBackendOrderToKitchenOrder = (order: BackendOrder): KitchenOrder & { created_at: string } => ({
  id: String(order.order_id),
  table: String(order.table_id),
  items: (order.items || []).map(item => ({
    name: item.item_name || 'N/A',
    quantity: item.quantity,
    specialInstructions: item.special_instructions,
    category: item.item_category || 'Uncategorized'
  })),
  time: formatDistanceToNow(new Date(order.created_at), { addSuffix: true }),
  status: order.order_status,
  created_at: order.created_at,
  orderType: order.order_type,
});

// Default empty analytics structure
const defaultAnalytics: AnalyticsData = {
  totalRevenue: 0,
  newOrders: 0,
  avgOrderValue: 0,
  revenueChangeText: '',
  ordersChangeText: '',
  avgValueChangeText: ''
};

// --- Cart Provider Component ---
export const CartProvider = ({ children }: { children: ReactNode }) => {
  // --- State Variables ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const { toast } = useToast();
  const isSubmittingRef = useRef(false);
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrdersState>({
    new: [],
    'in-progress': [],
    completed: []
  });
  const [taxRate, setTaxRateState] = useState(0.08);
  const [discountRate, setDiscountRate] = useState(0.00);
  const router = useRouter();
  const [menuItems, setMenuItemsState] = useState<MenuItem[]>([]);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('weekly');
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [backendTables, setBackendTables] = useState<any[]>([]);
  const [customerDetails, setCustomerDetails] = useState<{ name: string; phone: string; } | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);

  // --- Initial Data Loading Effect ---
  useEffect(() => {
    setIsCartLoading(true);

    // Load cart from localStorage
    const storedCart = safeJsonParse<CartItem[]>(localStorage.getItem('cart')) ?? [];
    setCart(storedCart);

    // Load table number from localStorage
    const storedTableNumber = safeJsonParse<string>(localStorage.getItem('tableNumber'));
    if (storedTableNumber) {
      setTableNumber(storedTableNumber);
    }
    
    // Load customer details from localStorage
    const storedCustomer = safeJsonParse<{ name: string; phone: string }>(
      localStorage.getItem('Five_petals_customer')
    );

    if (storedCustomer) {
      setCustomerDetails(storedCustomer);
    }
    
    // Load session token from localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('session_token');
      //console.log('[DEBUG INIT] Loaded session_token:', stored ? 'present' : 'null');
      if (stored) {
        setSessionToken(stored);
      }
    }

    // Load admin-specific data if authenticated
    if (hasAuthToken()) {

      const storedMenuItems = safeJsonParse<MenuItem[]>(localStorage.getItem('menuItems')) ?? [];
      const storedTaxRate = safeJsonParse<number>(localStorage.getItem('taxRate')) ?? 0.08;
      const storedDiscountRate = safeJsonParse<number>(localStorage.getItem('discountRate')) ?? 0.00;
      setMenuItemsState(storedMenuItems);
      setTaxRateState(storedTaxRate);
      setDiscountRate(storedDiscountRate);
    }

    // Initialize empty orders
    setPastOrders([]);

    // Connect socket
    console.log('[DEBUG INIT] Connecting socket...');
    connectSocket();

    setIsCartLoading(false);

  }, []);



  // --- API Fetching Functions ---
  const extractArrayFromResponse = (responseData: any, context: string): any[] => {
    if (Array.isArray(responseData)) {
      //console.log(`[DEBUG ${context}] Response is direct array:`, responseData.length);
      return responseData;
    }

    if (responseData && Array.isArray(responseData.data)) {
      //console.log(`[DEBUG ${context}] Extracted array from response.data:`, responseData.data.length);
      return responseData.data;
    }

    if (responseData && responseData.success === true && Array.isArray(responseData.orders)) {
      //console.log(`[DEBUG ${context}] Extracted array from response.orders:`, responseData.orders.length);
      return responseData.orders;
    }

    if (responseData && responseData.success === true && Array.isArray(responseData.tables)) {
      //console.log(`[DEBUG ${context}] Extracted array from response.tables:`, responseData.tables.length);
      return responseData.tables;
    }

    console.warn(`[DEBUG ${context}] Response not array or standard wrapper:`, responseData);
    return [];
  };

  const fetchTables = useCallback(async () => {
    const role = getStoredRole();
    if (role !== 'admin') {
        setBackendTables([]);
        return;
    }

    try {
      const res = await fetch(`${API_BASE}/tables`, { method: 'GET' ,headers: { ...authHeaders() } });
      if (res.status === 403) {
          setBackendTables([]);
          return;
      }
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setBackendTables(extractArrayFromResponse(data, 'fetchTables'));
    } catch (error) {
        console.error('[DEBUG] Error fetchTables:', error);
        setBackendTables([]);
    }
  }, []);

  const fetchKitchenOrders = useCallback(async () => {

    try {
      const res = await fetch(`${API_BASE}/orders/kitchen/active`, {
        headers: { ...authHeaders() }
      });

      //console.log('[DEBUG] Fetch kitchen orders status:', res.status);

      if (res.status === 403) {
        throw new Error('Permission denied (403)');
      }

      if (!res.ok) throw new Error(`Status ${res.status}`);

      const responseData = await res.json();
      const orders: BackendOrder[] = extractArrayFromResponse(responseData, 'fetchKitchenOrders');

      if (!Array.isArray(orders)) {
        throw new Error('Invalid data format');
      }

      const newO: (KitchenOrder & { created_at: string })[] = [];
      const inProg: (KitchenOrder & { created_at: string })[] = [];
      const ready: (KitchenOrder & { created_at: string })[] = [];

      orders.forEach(o => {
        const ko = mapBackendOrderToKitchenOrder(o);
          if (o.order_status === 'pending' || o.order_status === 'confirmed') {
      newO.push(ko);
  } else if (o.order_status === 'preparing') {
      inProg.push(ko);
  } else if (o.order_status === 'ready') {
      ready.push(ko);
  }
      });

      const sortByDateDesc = (a: { created_at: string }, b: { created_at: string }) =>
        parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime();

      newO.sort(sortByDateDesc);
      inProg.sort(sortByDateDesc);
      ready.sort(sortByDateDesc);

      setKitchenOrders({
        new: newO,
        'in-progress': inProg,
        completed: ready
      });

      //console.log('[DEBUG] Updated kitchen orders state successfully.');
    } catch (error) {
      console.error('[DEBUG] Error fetchKitchenOrders:', error);
      toast({
        variant: 'destructive',
        title: 'Kitchen Error',
        description: (error as Error).message
      });
      setKitchenOrders({ new: [], 'in-progress': [], completed: [] });
    }
  }, [toast]);

  //  fetchRelevantOrders
  const fetchRelevantOrders = useCallback(async () => {

      let url = `${API_BASE}/orders`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      
      const isAdminUser = hasAuthToken();

      if (isAdminUser) {
        // Admin: fetch all orders with all statuses
        const queryParams: string[] = [];
        ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled']
          .forEach(s => queryParams.push(`status=${s}`));
        queryParams.push('limit=200');
        url = `${API_BASE}/orders?${queryParams.join('&')}`;

        Object.assign(headers, authHeaders());
        //console.log('[DEBUG FETCH] Admin mode - URL:', url);
      } else if (sessionToken && tableNumber) {
        // Customer: Fetch orders for current session (INCLUDING COMPLETED)
        const queryParams: string[] = [];

        // This allows receipt download during grace period
        ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed']
          .forEach(s => queryParams.push(`status=${s}`));
        
        // Pass tableId
        queryParams.push(`tableId=${tableNumber}`);
        
        url = `${API_BASE}/orders?${queryParams.join('&')}`;
        
        // CRITICAL: Session token in header
        headers['x-session-token'] = sessionToken;

      } else {
        // No valid auth
        //console.log('[DEBUG FETCH] No auth - returning empty');
        setPastOrders([]);
        return;
      }

      try {

        
        const res = await fetch(url, { headers });

        //console.log('[DEBUG FETCH] Response status:', res.status);

        if (!res.ok) {
            if (isAdminUser) {
              toast({ variant: 'destructive', title: 'Auth Error' });
            }
            //console.log('[DEBUG FETCH] Response not OK, clearing orders');
            setPastOrders([]);
            return;
        }

        if (res.status === 401 || res.status === 403) {
              if (!isAdminUser) {
                  console.log(' Session expired/invalid. Clearing local token.');
                  localStorage.removeItem('session_token');
                  setSessionToken(null);
              }
              setPastOrders([]);
              return;
        }

        const responseData = await res.json();
        //console.log('[DEBUG FETCH] Raw response:', responseData);

        const orders: BackendOrder[] = extractArrayFromResponse(responseData, `fetchRelevantOrders`);


        let filteredOrders = orders;
        
        if (!isAdminUser) {
          // Only filter out cancelled orders for customers
          const beforeFilter = filteredOrders.length;
          filteredOrders = orders.filter(o => {
            const status = o.order_status?.toLowerCase();

            // Only filter out cancelled orders
            if (status === 'cancelled') {
              return false;
            }

            return true;
          });

        }

        setPastOrders(filteredOrders.map(mapBackendOrderToPastOrder));

      } catch (error) {
        console.error(`[DEBUG FETCH] Error in fetchRelevantOrders:`, error);
        setPastOrders([]);
      }
}, [sessionToken, tableNumber, toast]);


    useEffect(() => {
      if (!sessionToken && !hasAuthToken()) {
        //console.log('[DEBUG SESSION EFFECT] No session token or auth, skipping fetch');
        return;
      }
      
      //console.log('[DEBUG SESSION EFFECT] Session or table changed, fetching orders...');
      //console.log('[DEBUG SESSION EFFECT] sessionToken:', sessionToken ? 'present' : 'null');
      //console.log('[DEBUG SESSION EFFECT] tableNumber:', tableNumber);
      
      // Fetch orders when session token or table becomes available
      fetchRelevantOrders();
    }, [sessionToken, tableNumber, fetchRelevantOrders]);

  // --- Socket Connection ---

  const connectSocket = useCallback(() => {
    if (socket || typeof window === 'undefined') {
      //console.log('[DEBUG SOCKET] Socket already connected or SSR, skipping connect.');
      return;
    }

    //console.log('[DEBUG SOCKET] Attempting socket connect...');
    const isAdminConnected = hasAuthToken();
    
    const newSocket = io(SOCKET_URL, {
      auth: (cb) => {
        const token = localStorage.getItem('accessToken');
        cb(token ? { token } : {});
      }
    });

    newSocket.on('connect', () => {
      //console.log('[DEBUG SOCKET] Socket connected:', newSocket.id, 'IsAdmin:', isAdminConnected);
      
      // Fetch orders on connect
      fetchRelevantOrders();
      
      if (isAdminConnected) {
        fetchTables();
        fetchKitchenOrders();
      }
    });

    newSocket.on('newOrder', (order: BackendOrder) => {
      //console.log('[DEBUG SOCKET] Event "newOrder" received', order?.order_id);
      toast({
        title: 'New Order!',
        description: `Table ${order?.table_id}`
      });
      
      fetchRelevantOrders();
      
      if (hasAuthToken()) {
        fetchKitchenOrders();
      }
    });

    newSocket.on('orderStatusUpdate', (data: { orderId: number; status: string; tableId: string; }) => {
      //console.log('[DEBUG SOCKET] Event "orderStatusUpdate" received', data);
      const friendlyStatus = data.status.charAt(0).toUpperCase() + data.status.slice(1);
      toast({
        title: 'Order Update',
        description: `Table ${data.tableId} is ${friendlyStatus}`
      });
      
      fetchRelevantOrders();
      
      if (hasAuthToken()) {
        fetchKitchenOrders();
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('[DEBUG SOCKET] Socket disconnected:', reason);
    });

    newSocket.on('connect_error', (err) => {
      console.error('[DEBUG SOCKET] Socket connection error:', err.message);
    });

    setSocket(newSocket);
  }, [socket, toast, fetchTables, fetchKitchenOrders, fetchRelevantOrders]);

  // --- Table Status Calculation  ---
  const tableStatuses = useMemo(() => {
    const isAdminUser = hasAuthToken();
    if (!isAdminUser || !Array.isArray(backendTables)) {
      return [];
    }

    const derived = backendTables.map(t => {
      const idStr = String(t.table_id || t.id);
      const numStr = t.table_number || idStr;
      const isOccupied = pastOrders.some(
        o => o.tableNumber === idStr &&
          o.paymentStatus === 'Pending' &&
          o.status !== 'Completed' &&
          o.status !== 'Cancelled'
      );

      return {
        id: t.table_id || t.id,
        tableNumber: numStr,
        capacity: t.capacity,
        qrCodeUrl: t.qr_code_url,
        isAvailable: t.is_available,
        status: isOccupied ? 'Occupied' : 'Empty'
      };
    });

    return derived;
  }, [pastOrders, backendTables]);

  // --- Table, Tax, Menu Management ---
  const setTable = useCallback((table: string) => {
    setTableNumber(table);
    writeToStorage('tableNumber', table);
    fetchRelevantOrders();
  }, [fetchRelevantOrders]);

  const updateSettings = useCallback(async (newTax: number, newDiscount: number) => {
    if (!hasAuthToken()) return;
    // Update local state
    setTaxRateState(newTax);
    setDiscountRate(newDiscount);
    writeToStorage('taxRate', newTax);
    writeToStorage('discountRate', newDiscount);

    try {
      console.log(`[DEBUG] Saving settings: Tax=${newTax}, Discount=${newDiscount}`);
      // Call the new unified settings endpoint
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ taxRate: newTax, discountRate: newDiscount })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errData.message);
      }
      console.log('[DEBUG] Settings saved.');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: (error as Error).message });
    }
  }, [toast]);

  // Backward compatibility wrapper for setTaxRate
  const setTaxRate = useCallback(async (newRate: number) => {
      await updateSettings(newRate, discountRate);
  }, [updateSettings, discountRate]);

  const setMenuItems = useCallback((items: MenuItem[]) => {
    if (!hasAuthToken()) return;
    setMenuItemsState(items);
    writeToStorage('menuItems', items);
  }, []);

  // --- Cart Management (Local State) ---
  const addToCart = useCallback((item: MenuItem) => {
    if (!item.isAvailable) {
      toast({
        variant: "destructive",
        title: "Item Unavailable",
        description: `${item.name} is out of stock.`
      });
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      const updated = existing
        ? prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { ...item, quantity: 1 }];
      writeToStorage('cart', updated);
      return updated;
    });

    toast({
      title: "Added to Cart",
      description: `${item.name} added.`
    });
  }, [toast]);

  const removeFromCart = useCallback((itemId: string) => {
    setCart((prev) => {
      const updated = prev.filter((i) => i.id !== itemId);
      writeToStorage('cart', updated);
      return updated;
    });
    toast({
      title: "Item Removed",
      variant: "destructive"
    });
  }, [toast]);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
    } else {
      setCart((prev) => {
        const updated = prev.map((i) => i.id === itemId ? { ...i, quantity } : i);
        writeToStorage('cart', updated);
        return updated;
      });
    }
  }, [removeFromCart]);

  const clearCart = useCallback(() => {
    setCart([]);
    writeToStorage('cart', []);
  }, []);

  const getTotalPrice = useCallback(
    () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
    [cart]
  );

  // --- REPEAT ORDER FUNCTION ---
  const repeatOrder = useCallback(async (orderId: string) => {
    const orderToRepeat = pastOrders.find(o => o.id === orderId);
    if (!orderToRepeat) return;

    setIsCartLoading(true);
    try {
        // 1. Fetch live menu
        const res = await fetch(`${API_BASE}/menu`);
        if (!res.ok) throw new Error('Failed to fetch menu');

        const rawData = await res.json();
        let menuArray: any[] = [];
        if (Array.isArray(rawData)) menuArray = rawData;
        else if (Array.isArray(rawData?.data)) menuArray = rawData.data;
        else if (Array.isArray(rawData?.items)) menuArray = rawData.items;

        const itemsToAdd: CartItem[] = [];

        // 2. Match past items with live menu
        orderToRepeat.items.forEach(pastItem => {
            const liveItemRaw = menuArray.find(m => String(m.item_id || m.id) === String(pastItem.id));

            if (liveItemRaw) {
                const isAvailable = liveItemRaw.is_available === true || liveItemRaw.is_available === 'true' || Number(liveItemRaw.is_available) === 1;

                if (isAvailable) {
                    const imageRaw = liveItemRaw.image_url || liveItemRaw.image;
                    const imageUrl = imageRaw ? (String(imageRaw).startsWith('http') ? imageRaw : `${API_BASE}${imageRaw}`) : 'https://placehold.co/300x300';

                    itemsToAdd.push({
                        id: String(liveItemRaw.item_id || liveItemRaw.id),
                        name: liveItemRaw.name,
                        description: liveItemRaw.description || '',
                        price: parseFloat(liveItemRaw.price),
                        image: { url: imageUrl, hint: '' },
                        category: liveItemRaw.category || 'Uncategorized',
                        isAvailable: true,
                        isVegetarian: !!liveItemRaw.is_vegetarian,
                        preparationTime: liveItemRaw.preparation_time,
                        quantity: pastItem.quantity,
                        specialInstructions: ''
                    });
                }
            }
        });

        if (itemsToAdd.length === 0) {
            toast({ variant: "destructive", title: "Unavailable", description: "Items no longer available." });
        } else {
            // 3. Add to Cart
            setCart(prevCart => {
                const newCart = [...prevCart];
                itemsToAdd.forEach(newItem => {
                    const existingIndex = newCart.findIndex(i => i.id === newItem.id);
                    if (existingIndex > -1) {
                        newCart[existingIndex].quantity += newItem.quantity;
                    } else {
                        newCart.push(newItem);
                    }
                });
                writeToStorage('cart', newCart);
                return newCart;
            });
            toast({ title: "Order Repeated", description: "Items added to cart." });
            router.push('/cart');
        }
    } catch (error) {
        console.error("Repeat Error:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not repeat order." });
    } finally {
        setIsCartLoading(false);
    }
  }, [pastOrders, toast, router]);

  // --- Order API Functions ---
  // Replace the placeOrder function in CartProvider

  const placeOrder = useCallback(async (
  total: number,
  customer: { name: string; phone: string; email?: string }
): Promise<boolean> => {
  // Prevent double submission
  if (isSubmittingRef.current) {
    //console.log('[DEBUG PLACE ORDER] Ignoring duplicate request');
    return false;
  }
  if (isCartLoading) {
    //console.log('[DEBUG PLACE ORDER] Already processing, ignoring duplicate request');
    return false;
  }
  
  if (!tableNumber) {
    toast({ variant: 'destructive', title: 'No Table Selected', description: 'Please scan a table QR code first.' });
    return false;
  }

  //console.log('[DEBUG PLACE ORDER] Starting order placement...');
  setIsCartLoading(true);

  const hasActiveOrder = pastOrders.some(
    o => o.tableNumber === tableNumber && 
    o.status !== 'Completed' && 
    o.status !== 'Cancelled'
  );
  const orderType = hasActiveOrder ? 'addon' : 'regular';

  const orderPayload = {
    tableId: parseInt(tableNumber, 10),
    items: cart.map(item => ({
      itemId: parseInt(item.id, 10),
      quantity: item.quantity,
      specialInstructions: item.specialInstructions || null
    })),
    customerName: customer.name,
    customerPhone: customer.phone,
    orderType,
  };

  //console.log('[DEBUG PLACE ORDER] Payload:', orderPayload);
  //console.log('[DEBUG PLACE ORDER] Current sessionToken:', sessionToken);

  try {
    const res = await fetch(`${API_BASE}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify(orderPayload)
    });

    const data = await res.json().catch(() => null);
    console.log('[DEBUG PLACE ORDER] Response:', data);

    if (!res.ok) {
      throw new Error(data?.message || `Order failed (${res.status})`);
    }

    // Extract session token
    const token =
      data?.data?.session_token ||
      data?.session_token ||
      data?.data?.sessionToken ||
      data?.data?.order?.session_token ||
      data?.sessionToken ||
      null;

    //console.log('[DEBUG PLACE ORDER] Extracted session_token:', token);

    if (token) {
      setSessionToken(token);
      try {
        localStorage.setItem('session_token', token);
        //console.log('[DEBUG PLACE ORDER] Saved session_token to localStorage');
      } catch (e) {
        //console.warn('[DEBUG PLACE ORDER] Could not write session_token to localStorage', e);
      }
    } else {
      //console.warn('[DEBUG PLACE ORDER] No session_token found in response');
    }

    // Clear cart and show success
    clearCart();
    toast({ 
      title: hasActiveOrder ? 'Add-on Placed!' : 'Order Placed!',
      description: 'Your order has been sent to the kitchen.'
    });
    
    // Save customer details
    setCustomerDetails({ name: customer.name, phone: customer.phone });
    writeToStorage('Five_petals_customer', customer);

    // Refresh orders
    console.log('[DEBUG PLACE ORDER] Fetching orders after successful placement...');
    await fetchRelevantOrders();

    return true;
    
  } catch (err) {
    console.error('[DEBUG PLACE ORDER] Failed to place order:', err);
    toast({ 
      variant: 'destructive', 
      title: 'Order Failed', 
      description: (err as Error).message 
    });
    return false;
    
  } finally {
    // Always reset loading state
    isSubmittingRef.current = false;
    setIsCartLoading(false);
    //console.log('[DEBUG PLACE ORDER] Order placement complete');
  }
}, [tableNumber, cart, clearCart, toast, fetchRelevantOrders, pastOrders, isCartLoading, sessionToken]);

  // --- Admin/Kitchen Order Actions ---
  const updateKitchenOrderStatus = useCallback(async (
    orderId: string,
    from: KitchenStatus,
    to: KitchenStatus
  ) => {
    if (!hasAuthToken()) return;

    let newBackendStatus: string | null = null;
    if (from === 'new') {
      newBackendStatus = 'preparing';
    } else if (from === 'in-progress') {
      newBackendStatus = 'ready';
    } else if (from === 'completed') {
      newBackendStatus = 'served';
    }

    if (!newBackendStatus) {
      console.error('Invalid status transition from:', from);
      return;
    }

    console.log(`[DEBUG updateStatus] Requesting change to: ${newBackendStatus} for order ${orderId}`);

    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ status: newBackendStatus })
      });

      console.log('[DEBUG updateStatus] Response status:', res.status);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({
          message: `Update failed (${res.status})`
        }));
        throw new Error(errData.message);
      }

      toast({
        title: 'Status Updated!',
        description: `Order is now ${newBackendStatus}`
      });

      console.log('[DEBUG updateStatus] Forcing fetchKitchenOrders after successful update.');
      fetchKitchenOrders();
    } catch (err) {
      console.error('Failed to update order status:', err);
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: (err as Error).message
      });
    }
  }, [toast, fetchKitchenOrders]);

  const requestPayment = useCallback(async (orderId: string, method: 'Cash' | 'UPI') => {

    try {
        const res = await fetch(`${API_BASE}/orders/${orderId}/payment-request`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                paymentStatus: 'Requested',
                paymentMethod: method
            })
        });

        if (!res.ok) throw new Error('Failed to request payment');

        await fetchRelevantOrders();

        if (method === 'Cash') {
            toast({ title: "Waiter Notified", description: "Please wait for a staff member to collect cash." });
        } else {
            toast({ title: "Payment Sent", description: "Please wait for confirmation." });
        }
    } catch (error) {
        toast({ variant: "destructive", title: "Request Failed", description: "Could not notify staff. Please try again." });
    }
  }, [toast, fetchRelevantOrders]);

  const approvePayment = useCallback(async (orderId: string) => {
    if (!hasAuthToken()) return;

    console.log(`[DEBUG approvePayment] Approving payment for order ${orderId}`);

    try {
      const res = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({ paymentStatus: 'Approved' })
      });

      console.log('[DEBUG approvePayment] Response status:', res.status);

      if (!res.ok) {
        const errData = await res.json().catch(() => ({
          message: `Approval failed (Status ${res.status})`
        }));
        throw new Error(errData.message || 'Failed to approve payment');
      }

      fetchRelevantOrders();
      toast({
        title: "Payment Approved",
        description: `Order #${orderId.slice(-4)} marked as paid.`
      });
    } catch (err) {
      console.error('Failed to approve payment:', err);
      toast({
        variant: 'destructive',
        title: 'Approval Failed',
        description: (err as Error).message
      });
    }
  }, [toast, fetchRelevantOrders]);

  const cancelOrder = useCallback(async (orderId: string) => {
    const isAdminUser = hasAuthToken();
    const isMyTableOrder = pastOrders.some(
      o => o.id === orderId && o.tableNumber === tableNumber
    );

    if (!isAdminUser && !isMyTableOrder) {
      toast({ variant: 'destructive', title: 'Unauthorized' });
      return;
    }

    try {
      const headers = isAdminUser
        ? authHeaders()
        : { 'Content-Type': 'application/json' };

      const res = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
        method: 'PATCH',
        headers
      });

      if (!res.ok) throw new Error('Failed to cancel order');

      fetchRelevantOrders();
      toast({
        title: "Order Cancelled",
        description: `Order #${orderId.slice(-6)} cancelled.`
      });
    } catch (err) {
      console.error('Failed to cancel order:', err);
      toast({
        variant: 'destructive',
        title: 'Cancel Failed',
        description: (err as Error).message
      });
    }
  }, [toast, fetchRelevantOrders, pastOrders, tableNumber]);

  // --- Table API Function ---
  const createTable = useCallback(async (
    tableNumStr: string,
    capacityNum: number
  ): Promise<boolean> => {
    if (!hasAuthToken()) {
      toast({ variant: 'destructive', title: 'Unauthorized' });
      return false;
    }

    console.log(`[DEBUG] Attempting to create table: Number=${tableNumStr}, Capacity=${capacityNum}`);

    try {
      const res = await fetch(`${API_BASE}/tables`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify({
          tableNumber: tableNumStr,
          capacity: capacityNum
        })
      });

      console.log('[DEBUG] Create table response status:', res.status);

      if (!res.ok) {
        const err = await res.json();
        console.error('[DEBUG] Create table error:', err);
        throw new Error(err.message || 'Failed to create table');
      }

      await fetchTables();
      toast({
        title: "Table Created",
        description: `Table ${tableNumStr} added.`
      });
      return true;
    } catch (err) {
      console.error('[DEBUG] Failed to create table:', err);
      toast({
        variant: "destructive",
        title: "Creation Failed",
        description: (err as Error).message
      });
      return false;
    }
  }, [toast, fetchTables]);

  const clearTableSession = useCallback(async (tableId: number) => {
    if (!hasAuthToken()) return;
    try {
        const res = await fetch(`${API_BASE}/tables/${tableId}/clear`, {
            method: 'POST',
            headers: { ...authHeaders() }
        });

        if (!res.ok) throw new Error('Failed to clear table');

        toast({ title: "Table Cleared", description: "Session expired and table is free." });
        fetchTables();
    } catch (e) { toast({ variant: 'destructive', title: "Failed", description: "Could not clear table." }); }
}, [toast, fetchTables]);

  // --- Analytics Calculation (Local - admin only) ---
  const analytics = useMemo(() => {
    if (!hasAuthToken() || !Array.isArray(pastOrders)) {
      return defaultAnalytics;
    }

    const now = new Date();
    const approvedOrders = pastOrders.filter(o => o.paymentStatus === 'Approved');

    const getPeriodInterval = (period: AnalyticsPeriod) => {
      if (period === 'daily') {
        return { start: startOfToday(), end: endOfToday() };
      }
      if (period === 'weekly') {
        return { start: startOfWeek(now), end: endOfWeek(now) };
      }
      if (period === 'monthly') {
        return { start: startOfMonth(now), end: endOfMonth(now) };
      }
      return { start: new Date(0), end: now };
    };

    const interval = getPeriodInterval(analyticsPeriod);
    const periodOrders = approvedOrders.filter(o =>
      isWithinInterval(new Date(o.date), interval)
    );

    const totalRevenue = periodOrders.reduce((sum, order) => sum + order.total, 0);
    const newOrdersCount = periodOrders.length;
    const avgOrderValue = newOrdersCount > 0 ? totalRevenue / newOrdersCount : 0;

    return {
      totalRevenue,
      newOrders: newOrdersCount,
      avgOrderValue,
      revenueChangeText: `vs previous ${analyticsPeriod}`,
      ordersChangeText: `this ${analyticsPeriod}`,
      avgValueChangeText: `this ${analyticsPeriod}`
    };
  }, [pastOrders, analyticsPeriod]);

  const salesData = useMemo(() => {
    if (!hasAuthToken() || !Array.isArray(pastOrders)) return [];

    const now = new Date();
    const approvedOrders = pastOrders.filter(o => o.paymentStatus === 'Approved');
    const interval = {
      start: startOfWeek(now, { weekStartsOn: 1 }),
      end: endOfWeek(now, { weekStartsOn: 1 })
    };

    const weekOrders = approvedOrders.filter(o =>
      isWithinInterval(new Date(o.date), interval)
    );

    const dailySales = eachDayOfInterval(interval).reduce(
      (acc, day) => ({ ...acc, [format(day, 'E')]: 0 }),
      {} as Record<string, number>
    );

    weekOrders.forEach(order => {
      const dayKey = format(new Date(order.date), 'E');
      if (dailySales[dayKey] !== undefined) {
        dailySales[dayKey] += order.total;
      }
    });

    return Object.entries(dailySales).map(([name, sales]) => ({
      name,
      sales: Math.round(sales)
    }));
  }, [pastOrders]);

  // --- Provide State and Actions through Context ---
  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalPrice,
        placeOrder,
        repeatOrder,
        pastOrders,
        kitchenOrders,
        updateKitchenOrderStatus,
        requestPayment,
        approvePayment,
        cancelOrder,
        taxRate,
        discountRate,
        updateSettings,
        setTaxRate,
        customerDetails,
        menuItems,
        setMenuItems,
        analytics,
        salesData,
        isCartLoading,
        tableNumber,
        setTable,
        tableStatuses,
        createTable,
        clearTableSession,
        analyticsPeriod,
        setAnalyticsPeriod,
        connectSocket,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// --- Custom Hook to Use Cart Context ---
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};