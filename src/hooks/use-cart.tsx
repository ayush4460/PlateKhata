// src/hooks/use-cart.tsx
'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback, useMemo } from 'react';
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
} from '@/lib/types'; // Make sure types.ts matches this structure
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
  parseISO, // Import parseISO for sorting dates
} from 'date-fns';
import { io, Socket } from 'socket.io-client';

// --- API & Socket Configuration ---
const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');
const SOCKET_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000').replace('/api/v1', '');

type KitchenStatus = 'new' | 'in-progress' | 'completed'; // Frontend statuses for kitchen columns

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
  placeOrder: (total: number, customer: { name: string; phone: string; email: string; }) => Promise<boolean>;
  pastOrders: PastOrder[];
  kitchenOrders: KitchenOrdersState;
  updateKitchenOrderStatus: (orderId: string, from: KitchenStatus, to: KitchenStatus) => void;
  approvePayment: (orderId: string) => void;
  cancelOrder: (orderId: string) => void;
  taxRate: number; // Current tax rate (decimal, e.g., 0.08)
  setTaxRate: (rate: number) => Promise<void>; // Admin action - now async
  menuItems: MenuItem[]; // Still needed for admin menu editor
  setMenuItems: (items: MenuItem[]) => void; // Admin action
  analytics: AnalyticsData; // Admin data - Make sure this is always an object
  salesData: SalesData[]; // Admin data
  isCartLoading: boolean;
  tableNumber: string | null; // Customer's current table
  setTable: (table: string) => void;
  tableStatuses: TableStatus[]; // Derived list for admin display
  createTable: (tableNumber: string, capacity: number) => Promise<boolean>; // Admin action
  analyticsPeriod: AnalyticsPeriod; // Admin setting
  setAnalyticsPeriod: (period: AnalyticsPeriod) => void; // Admin action
  connectSocket: () => void; // General connection function
}

// Create the context
const CartContext = createContext<CartContextType | undefined>(undefined);

// --- LocalStorage Helpers ---
const safeJsonParse = <T>(jsonString: string | null): T | null => {
  if (typeof window === 'undefined' || !jsonString) return null;
  try { return JSON.parse(jsonString); } catch (error) { console.error("Failed to parse JSON", error); return null; }
};
const writeToStorage = <T>(key: string, data: T) => {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(key, JSON.stringify(data)); } catch (error) { console.error(`Failed to write to localStorage: ${key}`, error); }
};

// --- Auth Helper ---
const authHeaders = () => {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('accessToken');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
const hasAuthToken = () => typeof window !== 'undefined' && !!localStorage.getItem('accessToken'); // Helper to check token

// --- Data Mapping Helpers ---
const mapBackendOrderToPastOrder = (order: BackendOrder): PastOrder => ({
  id: String(order.order_id),
  userName: order.customer_name,
  userPhone: order.customer_phone,
  tableNumber: String(order.table_id),
  date: order.created_at,
  status: order.order_status, // Use order_status
  paymentStatus: order.payment_status || 'Pending',
  total: parseFloat(String(order.total_amount || '0')),
  items: (order.items || []).map(item => ({
      id: String(item.item_id), name: item.item_name || 'N/A', quantity: item.quantity,
      price: parseFloat(String(item.unit_price || item.price || '0')),
   })),
});
const mapBackendOrderToKitchenOrder = (order: BackendOrder): KitchenOrder & { created_at: string } => ({
  id: String(order.order_id),
  table: String(order.table_id),
  items: (order.items || []).map(item => ({
      name: item.item_name || 'N/A', quantity: item.quantity,
      specialInstructions: item.special_instructions,
  })),
  time: formatDistanceToNow(new Date(order.created_at), { addSuffix: true }),
  status: order.order_status, // Use order_status
  created_at: order.created_at, // Include the raw timestamp for sorting
});

// Default empty analytics structure
const defaultAnalytics: AnalyticsData = {
  totalRevenue: 0, newOrders: 0, avgOrderValue: 0,
  revenueChangeText: '', ordersChangeText: '', avgValueChangeText: ''
};


// --- Cart Provider Component ---
export const CartProvider = ({ children }: { children: ReactNode }) => {
  // --- State Variables ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const { toast } = useToast();
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrdersState>({ new: [], 'in-progress': [], completed: [] });
  const [taxRate, setTaxRateState] = useState(0.08);
  const [menuItems, setMenuItemsState] = useState<MenuItem[]>([]);
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsPeriod>('weekly');
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [backendTables, setBackendTables] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  // --- Initial Data Loading Effect ---
  useEffect(() => {
    setIsCartLoading(true);
    const storedCart = safeJsonParse<CartItem[]>(localStorage.getItem('cart')) ?? [];
    const storedTableNumber = safeJsonParse<string>(localStorage.getItem('tableNumber'));
    setCart(storedCart);
    if (storedTableNumber) { setTableNumber(storedTableNumber); }
    setPastOrders([]);

    if (hasAuthToken()) {
        console.log('[DEBUG Init] Token found.');
        const storedMenuItems = safeJsonParse<MenuItem[]>(localStorage.getItem('menuItems')) ?? [];
        const storedTaxRate = safeJsonParse<number>(localStorage.getItem('taxRate')) ?? 0.08;
        setMenuItemsState(storedMenuItems);
        setTaxRateState(storedTaxRate);
    } else {
        console.log('[DEBUG Init] No token found.');
    }
    connectSocket();
    setIsCartLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Runs once

  // --- API Fetching Functions ---
  const extractArrayFromResponse = (responseData: any, context: string): any[] => {
      if (Array.isArray(responseData)) { console.log(`[DEBUG ${context}] Response is direct array:`, responseData.length); return responseData; }
      if (responseData && Array.isArray(responseData.data)) { console.log(`[DEBUG ${context}] Extracted array from response.data:`, responseData.data.length); return responseData.data; }
      if (responseData && responseData.success === true && Array.isArray(responseData.orders)) { console.log(`[DEBUG ${context}] Extracted array from response.orders:`, responseData.orders.length); return responseData.orders; }
      if (responseData && responseData.success === true && Array.isArray(responseData.tables)) { console.log(`[DEBUG ${context}] Extracted array from response.tables:`, responseData.tables.length); return responseData.tables; }
      console.warn(`[DEBUG ${context}] Response not array or standard wrapper:`, responseData); return [];
  };

  const fetchTables = useCallback(async () => {
    if (!hasAuthToken()) { setBackendTables([]); return; }
    console.log('[DEBUG] Fetching tables...');
    try {
      const res = await fetch(`${API_BASE}/tables`, { headers: { ...authHeaders() } });
      console.log('[DEBUG] Fetch tables status:', res.status);
      if (res.status === 403) { console.error('[DEBUG] 403 Fetching tables.'); toast({ variant: 'destructive', title: 'Permission Denied'}); setBackendTables([]); return; }
      if (!res.ok) { const txt = await res.text(); throw new Error(`Status ${res.status}: ${txt}`); }
      const data = await res.json();
      const tablesArray = extractArrayFromResponse(data, 'fetchTables');
      setBackendTables(tablesArray);
    } catch (error) { console.error('[DEBUG] Error fetchTables:', error); toast({ variant: 'destructive', title: 'Table Error', description: (error as Error).message }); setBackendTables([]); }
  }, [toast]);

  const fetchKitchenOrders = useCallback(async () => {
    if (!hasAuthToken()) { setKitchenOrders({ new: [], 'in-progress': [], completed: [] }); return; }
    console.log('[DEBUG] Fetching kitchen orders...');
     try {
       const res = await fetch(`${API_BASE}/orders/kitchen/active`, { headers: { ...authHeaders() } });
       console.log('[DEBUG] Fetch kitchen orders status:', res.status);
       if (res.status === 403) { throw new Error('Permission denied (403)');}
       if (!res.ok) throw new Error(`Status ${res.status}`);

        const responseData = await res.json();
        const orders: BackendOrder[] = extractArrayFromResponse(responseData, 'fetchKitchenOrders');

        console.log('[DEBUG] Raw Kitchen Orders Data:', orders.length);
        if (!Array.isArray(orders)) { throw new Error('Invalid data format'); }

        const newO: (KitchenOrder & {created_at: string})[] = [],
              inProg: (KitchenOrder & {created_at: string})[] = [],
              ready: (KitchenOrder & {created_at: string})[] = [];

        orders.forEach(o => {
          const ko = mapBackendOrderToKitchenOrder(o);
          if (o.order_status === 'pending' || o.order_status === 'confirmed') { newO.push(ko); }
          else if (o.order_status === 'preparing') { inProg.push(ko); }
          else if (o.order_status === 'ready') { ready.push(ko); }
        });

        const sortByDateDesc = (a: {created_at: string}, b: {created_at: string}) => parseISO(b.created_at).getTime() - parseISO(a.created_at).getTime();
        newO.sort(sortByDateDesc);
        inProg.sort(sortByDateDesc);
        ready.sort(sortByDateDesc);

        console.log('[DEBUG] State to be set for kitchenOrders:', { new: newO.length, 'in-progress': inProg.length, completed: ready.length });
        setKitchenOrders({ new: newO, 'in-progress': inProg, completed: ready });
        console.log('[DEBUG] Updated kitchen orders state successfully.');
     } catch (error) {
       console.error('[DEBUG] Error fetchKitchenOrders:', error);
       toast({ variant: 'destructive', title: 'Kitchen Error', description: (error as Error).message });
       setKitchenOrders({ new: [], 'in-progress': [], completed: [] });
     }
  }, [toast]);

  // --- MODIFIED: fetchRelevantOrders ---
  const fetchRelevantOrders = useCallback(async () => {
      let url = `${API_BASE}/orders`;
      let headers: HeadersInit = { 'Content-Type': 'application/json' };
      const isAdminUser = hasAuthToken();
      let queryParams: string[] = [];
      let context = '';

      if (isAdminUser) {
          // --- FIX: Admin needs ALL statuses for stats, including completed and cancelled ---
          const adminStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'];
          queryParams = adminStatuses.map(s => `status=${s}`);
          queryParams.push('limit=200'); // Fetch more for stats
          url = `${API_BASE}/orders?${queryParams.join('&')}`;
          headers = { ...headers, ...authHeaders() }; // Admin needs auth
          context = 'Admin (All Statuses)';
          console.log('[DEBUG] Admin fetching ALL orders for dashboard...');
      } else if (tableNumber) {
          // Customer only needs ACTIVE statuses for their table
          const activeStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served'];
          queryParams = activeStatuses.map(s => `status=${s}`);
          queryParams.push(`tableId=${tableNumber}`);
          url = `${API_BASE}/orders?${queryParams.join('&')}`;
          context = `Customer Table ${tableNumber}`;
          console.log(`[DEBUG] Customer fetching active orders for table ${tableNumber}...`);
      } else {
          // Neither admin nor customer with a table context, clear orders
          console.log('[DEBUG] Not fetching relevant orders - no token or table number.');
          setPastOrders([]); return;
      }

      try {
        const res = await fetch(url, { headers });
        console.log(`[DEBUG] Fetch relevant orders (${context}) status:`, res.status);
        if (!res.ok && (res.status === 401 || res.status === 403)) {
             console.error(`[DEBUG] Auth error (${res.status}) fetchRelevantOrders.`);
             if (isAdminUser) { toast({ variant: 'destructive', title: 'Auth Error' }); }
             else { console.error('[DEBUG] Backend requires auth? Check optionalAuth.'); toast({ variant: 'destructive', title: 'Error' }); }
             setPastOrders([]); return;
        }
        if (!res.ok) { const errorText = await res.text(); throw new Error(`Status ${res.status}: ${errorText}`); }

        const responseData = await res.json();
        const orders: BackendOrder[] = extractArrayFromResponse(responseData, `fetchRelevantOrders (${context})`);

        console.log('[DEBUG] Raw Relevant Orders Data:', orders.length);
        if (!Array.isArray(orders)) { throw new Error('Invalid data format'); }

        const mappedOrders = orders.map(mapBackendOrderToPastOrder);
        console.log(`[DEBUG fetchRelevantOrders] Preparing to set pastOrders state with ${mappedOrders.length} orders.`);
        setPastOrders(mappedOrders);
        console.log('[DEBUG fetchRelevantOrders] Successfully called setPastOrders.');
      } catch (error) {
        console.error(`[DEBUG] Error fetchRelevantOrders (${context}):`, error);
        if (isAdminUser) { toast({ variant: 'destructive', title: 'Order Error', description: 'Could not load.' }); }
        setPastOrders([]);
      }
  }, [tableNumber, toast]); // Depends on tableNumber
  // --- END MODIFIED fetchRelevantOrders ---


  // --- Socket Connection ---
  const connectSocket = useCallback(() => {
    if (socket || typeof window === 'undefined') {
        console.log('[DEBUG] Socket already connected or SSR, skipping connect.');
        return;
    }
    console.log('[DEBUG] Attempting socket connect...');
    const isAdminConnected = hasAuthToken();
    const newSocket = io(SOCKET_URL, { auth: (cb) => { const token = localStorage.getItem('accessToken'); cb(token ? { token } : {}); } });

    newSocket.on('connect', () => {
      console.log('[DEBUG] Socket connected:', newSocket.id, 'IsAdmin:', isAdminConnected);
      fetchRelevantOrders(); // Fetch initial orders based on context
      if (isAdminConnected) { fetchTables(); fetchKitchenOrders(); }
    });
    newSocket.on('newOrder', (order: BackendOrder) => {
        console.log('[DEBUG] Socket: Event "newOrder" received', order?.order_id);
        toast({ title: 'New Order!', description: `Table ${order?.table_id}` });
        console.log('[DEBUG] newOrder: Calling fetchRelevantOrders...');
        fetchRelevantOrders();
        if (hasAuthToken()) {
            console.log('[DEBUG] newOrder: Calling fetchKitchenOrders...');
            fetchKitchenOrders();
        }
    });
    newSocket.on('orderStatusUpdate', (data: { orderId: number; status: string; tableId: string; }) => {
        console.log('[DEBUG] Socket: Event "orderStatusUpdate" received', data);
        const friendlyStatus = data.status.charAt(0).toUpperCase() + data.status.slice(1);
        toast({ title: 'Order Update', description: `Table ${data.tableId} is ${friendlyStatus}` });
        console.log('[DEBUG] orderStatusUpdate: Calling fetchRelevantOrders...');
        fetchRelevantOrders();
        if (hasAuthToken()) {
            console.log('[DEBUG] orderStatusUpdate: Calling fetchKitchenOrders...');
            fetchKitchenOrders();
        }
    });
    newSocket.on('disconnect', (reason) => { console.log('[DEBUG] Socket disconnected:', reason); });
    newSocket.on('connect_error', (err) => { console.error('[DEBUG] Socket connection error:', err.message); });
    setSocket(newSocket);
  }, [socket, toast, tableNumber, fetchTables, fetchKitchenOrders, fetchRelevantOrders]);

  // --- Table Status Calculation (Derived State) ---
  const tableStatuses = useMemo(() => {
    const isAdminUser = hasAuthToken();
    if (!isAdminUser || !Array.isArray(backendTables)) { return []; }
    // `pastOrders` (thanks to the fix above) now contains ALL orders for the admin
    const derived = backendTables.map(t => {
      const idStr = String(t.table_id || t.id);
      const numStr = t.table_number || idStr;
      // This logic remains correct: find an active order with pending payment
      const isOccupied = pastOrders.some(o => o.tableNumber === idStr && o.paymentStatus === 'Pending' && o.status !== 'completed' && o.status !== 'cancelled');
      return { id: t.table_id || t.id, tableNumber: numStr, capacity: t.capacity, qrCodeUrl: t.qr_code_url, isAvailable: t.is_available, status: isOccupied ? 'Occupied' : 'Empty' };
    });
    return derived;
  }, [pastOrders, backendTables]);

  // --- Table, Tax, Menu Management ---
  const setTable = useCallback((table: string) => {
    setTableNumber(table);
    writeToStorage('tableNumber', table);
    fetchRelevantOrders();
  }, [fetchRelevantOrders]);

  const setTaxRate = useCallback(async (newRateDecimal: number) => {
    if (!hasAuthToken()) return;
    setTaxRateState(newRateDecimal);
    writeToStorage('taxRate', newRateDecimal);
    try {
      const res = await fetch(`${API_BASE}/settings/tax`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ taxRate: newRateDecimal }) });
      if (!res.ok) { const errData = await res.json().catch(()=>({message: 'Unknown error'})); throw new Error(errData.message); }
      console.log('[DEBUG] Tax rate saved.');
    } catch (error) {
      console.error('Failed to save tax rate:', error);
      toast({ variant: 'destructive', title: 'Save Failed', description: (error as Error).message });
    }
  }, [toast]);

  const setMenuItems = useCallback((items: MenuItem[]) => { if (!hasAuthToken()) return; setMenuItemsState(items); writeToStorage('menuItems', items); }, []);

  // --- Cart Management (Local State) ---
  const addToCart = useCallback((item: MenuItem) => {
      if (!item.isAvailable) { toast({ variant: "destructive", title:"Item Unavailable", description:`${item.name} is out of stock.` }); return; }
      setCart((prev) => {
          const existing = prev.find((i) => i.id === item.id);
          const updated = existing ? prev.map((i) => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i) : [...prev, { ...item, quantity: 1 }];
          writeToStorage('cart', updated); return updated;
      });
      toast({ title: "Added to Cart", description: `${item.name} added.` });
  }, [toast]);
  const removeFromCart = useCallback((itemId: string) => {
      setCart((prev) => { const updated = prev.filter((i) => i.id !== itemId); writeToStorage('cart', updated); return updated; });
      toast({ title: "Item Removed", variant: "destructive" });
  }, [toast]);
  const updateQuantity = useCallback((itemId: string, quantity: number) => {
      if (quantity <= 0) { removeFromCart(itemId); }
      else { setCart((prev) => { const updated = prev.map((i) => i.id === itemId ? { ...i, quantity } : i); writeToStorage('cart', updated); return updated; }); }
  }, [removeFromCart]);
  const clearCart = useCallback(() => { setCart([]); writeToStorage('cart', []); }, []);
  const getTotalPrice = useCallback(() => cart.reduce((total, item) => total + item.price * item.quantity, 0), [cart]);

  // --- Order API Functions ---
  const placeOrder = useCallback(async (total: number, customer: { name: string; phone: string; email: string; }): Promise<boolean> => {
      if (!tableNumber) { toast({ variant: "destructive", title: "No Table Selected", description: "Please scan a table QR code first." }); return false; }
      const orderPayload = {
          tableId: parseInt(tableNumber, 10),
          items: cart.map(item => ({ itemId: parseInt(item.id, 10), quantity: item.quantity, specialInstructions: item.specialInstructions || null })),
          customerName: customer.name,
          customerPhone: customer.phone,
          customerEmail: customer.email
      };
      setIsCartLoading(true);
      console.log('[DEBUG placeOrder] Sending payload:', orderPayload);
      try {
          const res = await fetch(`${API_BASE}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(orderPayload) });
          console.log('[DEBUG placeOrder] Response status:', res.status);
          if (!res.ok) { const err = await res.json().catch(() => ({ message: `HTTP Error ${res.status}. Check backend logs.` })); throw new Error(err.message || 'Failed to place order. Please try again.'); }
          clearCart();
          toast({ title: "Order Placed!", description: "Sent to kitchen." });
          console.log('[DEBUG placeOrder] Calling fetchRelevantOrders after success...');
          await fetchRelevantOrders(); // Fetch immediately for customer view
          setIsCartLoading(false);
          return true;
      } catch (err) {
          console.error('Failed to place order:', err);
          toast({ variant: "destructive", title: "Order Failed", description: (err as Error).message });
          setIsCartLoading(false); return false;
      }
  }, [tableNumber, cart, clearCart, toast, fetchRelevantOrders]);

  // --- Admin/Kitchen Order Actions ---
  const updateKitchenOrderStatus = useCallback(async (orderId: string, from: KitchenStatus, to: KitchenStatus) => {
      if (!hasAuthToken()) return;
      let newBackendStatus: string | null = null;
      if (from === 'new') { newBackendStatus = 'preparing'; }
      else if (from === 'in-progress') { newBackendStatus = 'ready'; }
      else if (from === 'completed') { newBackendStatus = 'served'; }
      if (!newBackendStatus) { console.error('Invalid status transition from:', from); return; }

      console.log(`[DEBUG updateStatus] Requesting change to: ${newBackendStatus} for order ${orderId}`);
      try {
          const res = await fetch(`${API_BASE}/orders/${orderId}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ status: newBackendStatus }) });
          console.log('[DEBUG updateStatus] Response status:', res.status);
          if (!res.ok) { const errData = await res.json().catch(() => ({ message: `Update failed (${res.status})` })); throw new Error(errData.message); }
          toast({ title: 'Status Updated!', description: `Order is now ${newBackendStatus}` });
          console.log('[DEBUG updateStatus] Forcing fetchKitchenOrders after successful update.');
          fetchKitchenOrders();
      } catch (err) {
          console.error('Failed to update order status:', err);
          toast({ variant: 'destructive', title: 'Update Failed', description: (err as Error).message });
      }
  }, [toast, fetchKitchenOrders]);

  const approvePayment = useCallback(async (orderId: string) => {
      if (!hasAuthToken()) return;
      console.log(`[DEBUG approvePayment] Approving payment for order ${orderId}`);
      try {
          const res = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json', ...authHeaders() },
              body: JSON.stringify({ paymentStatus: 'Approved' })
          });
          console.log('[DEBUG approvePayment] Response status:', res.status);
          if (!res.ok) {
              const errData = await res.json().catch(() => ({ message: `Approval failed (Status ${res.status})` }));
              throw new Error(errData.message || 'Failed to approve payment');
          }
          fetchRelevantOrders(); // Force refresh state
          toast({ title: "Payment Approved", description: `Order #${orderId.slice(-4)} marked as paid.` });
       } catch (err) {
           console.error('Failed to approve payment:', err);
           toast({ variant: 'destructive', title: 'Approval Failed', description: (err as Error).message });
       }
  }, [toast, fetchRelevantOrders]);

  const cancelOrder = useCallback(async (orderId: string) => {
      const isAdminUser = hasAuthToken();
      const isMyTableOrder = pastOrders.some(o => o.id === orderId && o.tableNumber === tableNumber);
      if (!isAdminUser && !isMyTableOrder) { toast({ variant: 'destructive', title: 'Unauthorized' }); return; }
      try {
          const headers = isAdminUser ? authHeaders() : { 'Content-Type': 'application/json' };
          const res = await fetch(`${API_BASE}/orders/${orderId}/cancel`, { method: 'PATCH', headers });
          if (!res.ok) throw new Error('Failed to cancel order');
          fetchRelevantOrders();
          toast({ title: "Order Cancelled", description: `Order #${orderId.slice(-6)} cancelled.` });
       } catch (err) {
           console.error('Failed to cancel order:', err);
           toast({ variant: 'destructive', title: 'Cancel Failed', description: (err as Error).message });
       }
  }, [toast, fetchRelevantOrders, pastOrders, tableNumber]);

  // --- Table API Function ---
  const createTable = useCallback(async (tableNumStr: string, capacityNum: number): Promise<boolean> => {
      if (!hasAuthToken()) { toast({ variant: 'destructive', title: 'Unauthorized' }); return false; }
      console.log(`[DEBUG] Attempting to create table: Number=${tableNumStr}, Capacity=${capacityNum}`);
      try {
          const res = await fetch(`${API_BASE}/tables`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...authHeaders() }, body: JSON.stringify({ tableNumber: tableNumStr, capacity: capacityNum }) });
          console.log('[DEBUG] Create table response status:', res.status);
          if (!res.ok) { const err = await res.json(); console.error('[DEBUG] Create table error:', err); throw new Error(err.message || 'Failed to create table'); }
          await fetchTables(); // Refresh table list
          toast({ title: "Table Created", description: `Table ${tableNumStr} added.` });
          return true;
      } catch (err) {
          console.error('[DEBUG] Failed to create table:', err);
          toast({ variant: "destructive", title: "Creation Failed", description: (err as Error).message });
          return false;
      }
  }, [toast, fetchTables]);

  // --- Analytics Calculation (Local - admin only) ---
  const analytics = useMemo(() => {
    if (!hasAuthToken() || !Array.isArray(pastOrders)) { return defaultAnalytics; }
    const now = new Date(); const approvedOrders = pastOrders.filter(o => o.paymentStatus === 'Approved');
    const getPeriodInterval = (period: AnalyticsPeriod) => { if (period === 'daily') return { start: startOfToday(), end: endOfToday() }; if (period === 'weekly') return { start: startOfWeek(now), end: endOfWeek(now) }; if (period === 'monthly') return { start: startOfMonth(now), end: endOfMonth(now) }; return { start: new Date(0), end: now }; };
    const interval = getPeriodInterval(analyticsPeriod); const periodOrders = approvedOrders.filter(o => isWithinInterval(new Date(o.date), interval));
    const totalRevenue = periodOrders.reduce((sum, order) => sum + order.total, 0); const newOrdersCount = periodOrders.length;
    const avgOrderValue = newOrdersCount > 0 ? totalRevenue / newOrdersCount : 0;
    return { totalRevenue, newOrders: newOrdersCount, avgOrderValue, revenueChangeText: `vs previous ${analyticsPeriod}`, ordersChangeText: `this ${analyticsPeriod}`, avgValueChangeText: `this ${analyticsPeriod}` };
 }, [pastOrders, analyticsPeriod]);

  const salesData = useMemo(() => {
    if (!hasAuthToken() || !Array.isArray(pastOrders)) return [];
    const now = new Date(); const approvedOrders = pastOrders.filter(o => o.paymentStatus === 'Approved');
    const interval = { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
    const weekOrders = approvedOrders.filter(o => isWithinInterval(new Date(o.date), interval));
    const dailySales = eachDayOfInterval(interval).reduce((acc, day) => ({ ...acc, [format(day, 'E')]: 0 }), {} as Record<string, number>);
    weekOrders.forEach(order => { const dayKey = format(new Date(order.date), 'E'); if (dailySales[dayKey] !== undefined) dailySales[dayKey] += order.total; });
    return Object.entries(dailySales).map(([name, sales]) => ({ name, sales: Math.round(sales) }));
  }, [pastOrders]);

  // --- Provide State and Actions through Context ---
  return (
    <CartContext.Provider
      value={{
        cart, addToCart, removeFromCart, updateQuantity, clearCart, getTotalPrice,
        placeOrder, pastOrders, kitchenOrders, updateKitchenOrderStatus, approvePayment, cancelOrder,
        taxRate, setTaxRate, menuItems, setMenuItems, analytics, salesData, isCartLoading,
        tableNumber, setTable, tableStatuses, createTable,
        analyticsPeriod, setAnalyticsPeriod, connectSocket,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

// --- Custom Hook to Use Cart Context ---
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) { throw new Error('useCart must be used within a CartProvider'); }
  return context;
};