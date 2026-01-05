// src/hooks/use-cart.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
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
  PaymentStats,
  AdvancedAnalytics,
  SellingItem,
} from "@/lib/types";
import { DateRange } from "react-day-picker";
import { useToast } from "./use-toast";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  format,
  subDays,
  eachDayOfInterval,
  eachHourOfInterval,
  eachMonthOfInterval,
  startOfToday,
  endOfToday,
  startOfDay,
  endOfDay,
  startOfYear,
  endOfYear,
  formatDistanceToNow,
  parseISO,
} from "date-fns";
import {
  getISTDate,
  getISTStartOfDay,
  getISTEndOfDay,
  toISTDisplayDate,
  getISTDayRange,
} from "@/lib/utils";
import { io, Socket } from "socket.io-client";
import { useRouter, usePathname } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { write } from "fs";

// --- API & Socket Configuration ---
const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");
const SOCKET_URL = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace("/api/v1", "");

type KitchenStatus = "new" | "in-progress" | "completed";

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
  updateItemInstructions: (itemId: string, instructions: string) => void;
  clearCart: () => void;
  getTotalPrice: () => number;
  placeOrder: (
    total: number,
    customer: { name: string; phone: string; email?: string }
  ) => Promise<boolean>;
  repeatOrder: (orderId: string) => Promise<void>;
  pastOrders: PastOrder[];
  kitchenOrders: KitchenOrdersState;
  updateKitchenOrderStatus: (
    orderId: string,
    from: KitchenStatus,
    to: KitchenStatus
  ) => void;
  requestPayment: (orderId: string, method: "Cash" | "UPI") => Promise<void>;
  approvePayment: (orderId: string) => Promise<void>;
  updatePaymentMethod: (
    orderId: string,
    method: string,
    status?: string
  ) => Promise<void>;
  settleTable: (tableId: number | string, method: string) => Promise<void>;
  cancelOrder: (orderId: string) => Promise<void>;
  taxRate: number;
  discountRate: number;
  upiId: string;
  updateSettings: (
    tax: number,
    discount: number,
    upiId: string,
    zomatoId?: string,
    swiggyId?: string,
    name?: string,
    address?: string,
    contactEmail?: string,
    tagline?: string,
    contactNumber?: string,
    fssaiLicNo?: string,
    gstin?: string
  ) => Promise<void>;
  zomatoRestaurantId: string;
  swiggyRestaurantId: string;
  restaurantName: string | null;
  restaurantAddress: string | null;
  restaurantTagline: string | null;
  contactEmail: string | null;
  contactNumber: string | null;
  fssaiLicNo: string | null;
  gstin: string | null;
  setTaxRate: (rate: number) => Promise<void>;
  menuItems: MenuItem[];
  setMenuItems: (items: MenuItem[]) => void;
  analytics: AnalyticsData;
  salesData: SalesData[];
  paymentStats: PaymentStats[]; // Added
  isCartLoading: boolean;
  tableNumber: string | null;
  customerDetails: { name: string; phone: string } | null;
  setTable: (table: string | null) => void;
  tableStatuses: TableStatus[];
  createTable: (tableNumber: string, capacity: number) => Promise<boolean>;
  deleteTable: (tableId: number) => Promise<boolean>;
  clearTableSession: (tableId: number) => Promise<void>;
  moveTable: (sourceTableId: number, targetTableId: number) => Promise<boolean>;
  refreshTables: () => Promise<void>;
  analyticsPeriod: AnalyticsPeriod;
  setAnalyticsPeriod: (period: AnalyticsPeriod) => void;
  connectSocket: () => void;
  restaurantId: string | null;
  setRestaurantId: (id: string) => void;
  tableId: string | null;
  setTableId: (id: string | null) => void;
  restaurantSlug: string | null;
  setRestaurantSlug: (slug: string) => void;
  tableToken: string | null;
  setTableToken: (token: string) => void;
  updateSessionTotal: (sessionId: string, newTotal: number) => Promise<void>;
  orderFilters: { startDate?: string; endDate?: string };
  setOrderFilters: (filters: { startDate?: string; endDate?: string }) => void;
  isTablesLoading: boolean;
  fetchRelevantOrders: (
    tokenOverride?: string,
    tableIdOverride?: string
  ) => Promise<void>;
  advancedAnalytics: AdvancedAnalytics | null;
  fetchAdvancedAnalytics: (start?: number, end?: number) => Promise<void>;
  advancedDateRange: DateRange | undefined;
  setAdvancedDateRange: (range: DateRange | undefined) => void;
}

// Create the context
const CartContext = createContext<CartContextType | undefined>(undefined);

// --- LocalStorage Helpers ---
const safeJsonParse = <T,>(jsonString: string | null): T | null => {
  if (typeof window === "undefined" || !jsonString) return null;
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Failed to parse JSON", error);
    return null;
  }
};

const writeToStorage = <T,>(key: string, data: T) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.error(`Failed to write to localStorage: ${key}`, error);
  }
};

// --- Auth Helper ---
const authHeaders = (): Record<string, string> => {
  if (typeof window === "undefined") return {};
  const headers: Record<string, string> = {};

  const adminToken = localStorage.getItem("accessToken");
  if (adminToken) headers["Authorization"] = `Bearer ${adminToken}`;

  const sessionToken = localStorage.getItem("session_token");
  if (sessionToken) headers["x-session-token"] = sessionToken;
  return headers;
};

// Helper to get role from storage safely
const getStoredRole = () => {
  if (typeof window === "undefined") return null;
  try {
    const user = JSON.parse(localStorage.getItem("adminUser") || "{}");
    return user.role || null;
  } catch {
    return null;
  }
};

const hasAuthToken = () =>
  typeof window !== "undefined" && !!localStorage.getItem("accessToken");

// --- Data Mapping Helpers ---
const mapBackendOrderToPastOrder = (order: BackendOrder): PastOrder => ({
  id: String(order.order_id),
  orderNumber: order.order_number,
  userName: order.customer_name,
  userPhone: order.customer_phone,
  tableNumber: order.table_number || String(order.table_id),
  tableId: String(order.table_id), // Added
  date: Number(order.created_at) || 0, // Fallback to 0 to prevent NaN
  status: (order.order_status.charAt(0).toUpperCase() +
    order.order_status.slice(1)) as PastOrder["status"],
  paymentStatus: order.payment_status || "Pending",
  paymentMethod: order.payment_method,
  total: parseFloat(String(order.total_amount || "0")),
  subtotal: parseFloat(String(order.subtotal || "0")),
  tax: parseFloat(String(order.tax_amount || "0")),
  discount: parseFloat(String(order.discount_amount || "0")),
  orderType: order.order_type,
  sessionId: order.session_id,
  items: (order.items || []).map((item) => ({
    id: String(item.item_id),
    name: item.item_name || "N/A",
    quantity: item.quantity,
    price: parseFloat(String(item.unit_price || item.price || "0")),
    category: item.item_category,
    spiceLevel: item.spice_level, // Added
  })),
  platform: order.external_platform, // Added
});

const mapBackendOrderToKitchenOrder = (
  order: BackendOrder
): KitchenOrder & { created_at: number } => {
  const createdAt = Number(order.created_at) || Date.now();
  return {
    id: String(order.order_id),
    orderNumber: order.order_number,
    table: order.table_number || String(order.table_id),
    items: (order.items || []).map((item) => ({
      name: item.item_name || "N/A",
      quantity: item.quantity,
      specialInstructions: item.special_instructions,
      category: item.item_category || "Uncategorized",
      spiceLevel: item.spice_level, // Added
    })),
    time: formatDistanceToNow(new Date(createdAt), {
      addSuffix: true,
    }),
    status: order.order_status as any,
    created_at: createdAt,
    orderType: order.order_type,
    platform: order.external_platform, // Added
  };
};

// Default empty analytics structure
const defaultAnalytics: AnalyticsData = {
  totalRevenue: 0,
  newOrders: 0,
  avgOrderValue: 0,
  revenueChangeText: "",
  ordersChangeText: "",
  avgValueChangeText: "",
};

// --- Cart Provider Component ---
export const CartProvider = ({ children }: { children: ReactNode }) => {
  // --- State Variables ---
  const [cart, setCart] = useState<CartItem[]>([]);
  const { toast } = useToast();
  const isSubmittingRef = useRef(false);
  const [pastOrders, setPastOrders] = useState<PastOrder[]>([]);
  const [activeOrders, setActiveOrders] = useState<PastOrder[]>([]); // NEW: For Table Status (Unfiltered)
  const [kitchenOrders, setKitchenOrders] = useState<KitchenOrdersState>({
    new: [],
    "in-progress": [],
    completed: [],
  });
  const [taxRate, setTaxRateState] = useState(0.0);
  const [discountRate, setDiscountRate] = useState(0.0);
  const [upiId, setUpiId] = useState("");
  const [zomatoRestaurantId, setZomatoRestaurantId] = useState("");
  const [swiggyRestaurantId, setSwiggyRestaurantId] = useState("");
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [restaurantAddress, setRestaurantAddress] = useState<string | null>(
    null
  );
  const [restaurantTagline, setRestaurantTagline] = useState<string | null>(
    null
  );
  const [contactEmail, setContactEmail] = useState<string | null>(null);
  const [contactNumber, setContactNumber] = useState<string | null>(null);
  const [fssaiLicNo, setFssaiLicNo] = useState<string | null>(null);
  const [gstin, setGstin] = useState<string | null>(null);
  const router = useRouter();
  const [menuItems, setMenuItemsState] = useState<MenuItem[]>([]);
  const [analyticsPeriod, setAnalyticsPeriodState] =
    useState<AnalyticsPeriod>("daily");

  const setAnalyticsPeriod = useCallback((period: AnalyticsPeriod) => {
    setAnalyticsPeriodState(period);

    // Use IST Date for reference
    const now = getISTDate();
    let start, end;

    switch (period) {
      case "daily":
        start = getISTStartOfDay();
        end = getISTEndOfDay();
        break;
      case "weekly":
        start = startOfWeek(now, { weekStartsOn: 1 });
        end = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "monthly":
        start = startOfMonth(now);
        end = endOfMonth(now);
        break;
      case "all-time":
        // Fetch a wide range, e.g., current year or last 5 years
        start = startOfYear(new Date(2023, 0, 1)); // Reasonable past date
        end = endOfYear(now);
        break;
    }

    if (start && end) {
      setOrderFilters({
        startDate: format(start, "yyyy-MM-dd"),
        endDate: format(end, "yyyy-MM-dd"),
      });
    }
  }, []);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [tableNumber, setTableNumber] = useState<string | null>(null);
  const [backendTables, setBackendTables] = useState<any[]>([]);
  const [isTablesLoading, setIsTablesLoading] = useState(true);
  const [customerDetails, setCustomerDetails] = useState<{
    name: string;
    phone: string;
  } | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [restaurantId, setRestaurantIdState] = useState<string | null>(null);
  const [tableId, setTableId] = useState<string | null>(null);
  const [restaurantSlug, setRestaurantSlugState] = useState<string | null>(
    null
  );
  const [tableToken, setTableTokenState] = useState<string | null>(null);
  const [orderFilters, setOrderFilters] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});
  const [advancedAnalytics, setAdvancedAnalytics] =
    useState<AdvancedAnalytics | null>(null);
  const [advancedDateRange, setAdvancedDateRange] = useState<
    DateRange | undefined
  >({
    from: subDays(new Date(), 7),
    to: new Date(),
  });

  const fetchAdvancedAnalytics = useCallback(
    async (start?: number, end?: number) => {
      if (!hasAuthToken()) return;

      try {
        let url = `${API_BASE}/orders/analytics/advanced`;
        const params = new URLSearchParams();
        if (start) params.append("startDate", String(start));
        if (end) params.append("endDate", String(end));

        const res = await fetch(`${url}?${params.toString()}`, {
          headers: { ...authHeaders() },
        });

        if (!res.ok) throw new Error("Failed to fetch advanced analytics");
        const data = await res.json();
        setAdvancedAnalytics(data.data || data);
      } catch (err) {
        console.error("[useCart] fetchAdvancedAnalytics error:", err);
      }
    },
    []
  );

  useEffect(() => {
    if (hasAuthToken()) {
      const start = advancedDateRange?.from?.getTime();
      const end = advancedDateRange?.to?.getTime();
      fetchAdvancedAnalytics(start, end);
    }
  }, [advancedDateRange, fetchAdvancedAnalytics]);

  const fetchSettings = useCallback(async () => {
    if (
      !restaurantId ||
      restaurantId === "undefined" ||
      restaurantId === "null"
    ) {
      console.log(
        "[useCart] Skipping fetchSettings due to invalid restaurantId:",
        restaurantId
      );
      return;
    }
    try {
      const cleanId = restaurantId ? restaurantId.replace(/^"|"$/g, "") : "";
      const query = cleanId ? `?restaurantId=${cleanId}` : "";
      const res = await fetch(`${API_BASE}/settings/public${query}`, {
        headers: {
          "Content-Type": "application/json",
          ...authHeaders(),
        },
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();

      const payload = data?.data ?? data;
      if (payload) {
        if (typeof payload.taxRate === "number") {
          setTaxRateState(payload.taxRate);
          writeToStorage("taxRate", payload.taxRate);
        }
        if (typeof payload.discountRate === "number") {
          setDiscountRate(payload.discountRate);
          writeToStorage("discountRate", payload.discountRate);
        }
        if (typeof payload.upiId === "string") {
          setUpiId(payload.upiId);
          writeToStorage("upiId", payload.upiId);
        }
        if (typeof payload.zomatoRestaurantId === "string") {
          setZomatoRestaurantId(payload.zomatoRestaurantId);
        }
        if (typeof payload.swiggyRestaurantId === "string") {
          setSwiggyRestaurantId(payload.swiggyRestaurantId);
        }
        if (typeof payload.restaurantName === "string")
          setRestaurantName(payload.restaurantName);
        if (typeof payload.restaurantAddress === "string")
          setRestaurantAddress(payload.restaurantAddress);
        if (typeof payload.tagline === "string")
          setRestaurantTagline(payload.tagline);
        if (typeof payload.contactEmail === "string")
          setContactEmail(payload.contactEmail);
        if (typeof payload.contactNumber === "string")
          setContactNumber(payload.contactNumber);
        if (typeof payload.fssaiLicNo === "string")
          setFssaiLicNo(payload.fssaiLicNo);
        if (typeof payload.gstin === "string") setGstin(payload.gstin);
      }
    } catch (err) {
      console.error("[DEBUG SETTINGS] Failed to fetch public settings:", err);
    }
  }, [restaurantId]);

  // --- Initial Data Loading Effect ---
  // Split fetchSettings into its own effect to respond to ID changes
  useEffect(() => {
    if (restaurantId) {
      console.log(
        "[useCart] restaurantId changed, fetching settings for:",
        restaurantId
      );
      fetchSettings();
    }
  }, [restaurantId, fetchSettings]);

  useEffect(() => {
    setIsCartLoading(true);

    // Load cart from localStorage
    const storedCart =
      safeJsonParse<CartItem[]>(localStorage.getItem("cart")) ?? [];
    setCart(storedCart);

    // Load table number from localStorage (plain string)
    const storedTableNumber = localStorage.getItem("tableNumber");
    if (storedTableNumber) {
      setTableNumber(storedTableNumber);
    }

    // Load customer details from localStorage
    const storedCustomer = safeJsonParse<{ name: string; phone: string }>(
      localStorage.getItem("Five_petals_customer")
    );

    if (storedCustomer) {
      setCustomerDetails(storedCustomer);
    }

    // Load session token from localStorage
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("session_token");
      //console.log('[DEBUG INIT] Loaded session_token:', stored ? 'present' : 'null');
      if (stored) {
        setSessionToken(stored);
      }
    }

    // Load admin-specific data if authenticated
    if (hasAuthToken()) {
      const storedMenuItems =
        safeJsonParse<MenuItem[]>(localStorage.getItem("menuItems")) ?? [];
      const storedTaxRate =
        safeJsonParse<number>(localStorage.getItem("taxRate")) ?? 0.0;
      const storedDiscountRate =
        safeJsonParse<number>(localStorage.getItem("discountRate")) ?? 0.0;
      setMenuItemsState(storedMenuItems);
      setTaxRateState(storedTaxRate);
      setDiscountRate(storedDiscountRate);

      // Explicitly fetch tables on mount to ensure Admin Dashboard loads immediately
      fetchTables();
      fetchActiveOrders(); // NEW: Initial fetch
    }

    const storedUpiId = localStorage.getItem("upiId");
    if (storedUpiId) {
      setUpiId(storedUpiId);
    }

    const storedRestaurantId = localStorage.getItem("restaurantId");
    if (storedRestaurantId) {
      setRestaurantIdState(storedRestaurantId.replace(/^"|"$/g, ""));
    } else {
      // Fallback: Check if Admin is logged in
      try {
        const adminUser = JSON.parse(localStorage.getItem("adminUser") || "{}");
        if (adminUser.restaurantId) {
          console.log(
            "[DEBUG INIT] using adminUser restaurantId:",
            adminUser.restaurantId
          );
          setRestaurantIdState(
            String(adminUser.restaurantId).replace(/^"|"$/g, "")
          );
        }
      } catch (e) {}
    }

    const storedSlug = localStorage.getItem("restaurantSlug");
    console.log("[DEBUG INIT] Loaded storedSlug:", storedSlug);
    if (storedSlug) setRestaurantSlugState(storedSlug);

    const storedToken = localStorage.getItem("tableToken");
    console.log("[DEBUG INIT] Loaded storedToken:", storedToken);
    if (storedToken) setTableTokenState(storedToken);

    // Initialize empty orders
    setPastOrders([]);

    // Connect socket
    console.log("[DEBUG INIT] Connecting socket...");
    connectSocket();
    // fetchSettings() is now handled by its own useEffect
    setIsCartLoading(false);
  }, []);

  // --- API Fetching Functions ---
  const extractArrayFromResponse = (
    responseData: any,
    context: string
  ): any[] => {
    if (Array.isArray(responseData)) {
      //console.log(`[DEBUG ${context}] Response is direct array:`, responseData.length);
      return responseData;
    }

    if (responseData && Array.isArray(responseData.data)) {
      //console.log(`[DEBUG ${context}] Extracted array from response.data:`, responseData.data.length);
      return responseData.data;
    }

    if (
      responseData &&
      responseData.success === true &&
      Array.isArray(responseData.orders)
    ) {
      //console.log(`[DEBUG ${context}] Extracted array from response.orders:`, responseData.orders.length);
      return responseData.orders;
    }

    if (
      responseData &&
      responseData.success === true &&
      Array.isArray(responseData.tables)
    ) {
      //console.log(`[DEBUG ${context}] Extracted array from response.tables:`, responseData.tables.length);
      return responseData.tables;
    }

    console.warn(
      `[DEBUG ${context}] Response not array or standard wrapper:`,
      responseData
    );
    return [];
  };

  const fetchTables = useCallback(async () => {
    const role = getStoredRole();
    if (role !== "admin") {
      setBackendTables([]);
      setIsTablesLoading(false);
      return;
    }

    setIsTablesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/tables`, {
        method: "GET",
        headers: { ...authHeaders() },
      });
      if (res.status === 403) {
        setBackendTables([]);
        return;
      }
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setBackendTables(extractArrayFromResponse(data, "fetchTables"));
    } catch (error) {
      console.error("[DEBUG] Error fetchTables:", error);
      setBackendTables([]);
    } finally {
      setIsTablesLoading(false);
    }
  }, []);

  const fetchKitchenOrders = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/orders/kitchen/active`, {
        headers: { ...authHeaders() },
      });

      //console.log('[DEBUG] Fetch kitchen orders status:', res.status);

      if (res.status === 403) {
        throw new Error("Permission denied (403)");
      }

      if (!res.ok) throw new Error(`Status ${res.status}`);

      const responseData = await res.json();
      const orders: BackendOrder[] = extractArrayFromResponse(
        responseData,
        "fetchKitchenOrders"
      );

      if (!Array.isArray(orders)) {
        throw new Error("Invalid data format");
      }

      const newO: (KitchenOrder & { created_at: number })[] = [];
      const inProg: (KitchenOrder & { created_at: number })[] = [];
      const ready: (KitchenOrder & { created_at: number })[] = [];

      orders.forEach((o) => {
        const ko = mapBackendOrderToKitchenOrder(o);
        if (o.order_status === "pending" || o.order_status === "confirmed") {
          newO.push(ko);
        } else if (o.order_status === "preparing") {
          inProg.push(ko);
        } else if (o.order_status === "ready") {
          ready.push(ko);
        }
      });

      const sortByDateDesc = (
        a: { created_at: number },
        b: { created_at: number }
      ) => b.created_at - a.created_at;

      newO.sort(sortByDateDesc);
      inProg.sort(sortByDateDesc);
      ready.sort(sortByDateDesc);

      setKitchenOrders({
        new: newO,
        "in-progress": inProg,
        completed: ready,
      });

      //console.log('[DEBUG] Updated kitchen orders state successfully.');
    } catch (error) {
      console.error("[DEBUG] Error fetchKitchenOrders:", error);
      toast({
        variant: "destructive",
        title: "Kitchen Error",
        description: (error as Error).message,
      });
      setKitchenOrders({ new: [], "in-progress": [], completed: [] });
    }
  }, [toast]);

  const pathname = usePathname();

  //  fetchRelevantOrders
  const fetchRelevantOrders = useCallback(
    async (tokenOverride?: string, tableIdOverride?: string) => {
      let url = `${API_BASE}/orders`;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };

      const isAdminUser = hasAuthToken();
      const isDashboard = pathname?.includes("/dashboard");
      const currentSessionToken = tokenOverride || sessionToken;

      // Use Admin Mode ONLY if user is Admin AND on Dashboard
      // Otherwise, if they are on a public page (like /orders), treat them as a Customer
      if (isAdminUser && isDashboard) {
        // Admin: fetch all orders with all statuses
        const queryParams: string[] = [];
        [
          "pending",
          "confirmed",
          "preparing",
          "ready",
          "served",
          "completed",
          "cancelled",
        ].forEach((s) => queryParams.push(`status=${s}`));
        queryParams.push("limit=200");

        // Add Date Filters if present
        if (orderFilters.startDate)
          queryParams.push(`startDate=${orderFilters.startDate}`);
        if (orderFilters.endDate)
          queryParams.push(`endDate=${orderFilters.endDate}`);

        // OPTIMIZATION: If a specific table is requested (e.g. from TableDetails), filter by it to ensure we get the latest
        if (tableIdOverride) {
          queryParams.push(`tableId=${tableIdOverride}`);
        }

        url = `${API_BASE}/orders?${queryParams.join("&")}`;
        console.log("[DEBUG FETCH] Fetching orders with URL:", url); // ADDED LOG

        Object.assign(headers, authHeaders());
        //console.log('[DEBUG FETCH] Admin/Dashboard mode - URL:', url);
      } else if (currentSessionToken && tableNumber) {
        // Customer: Fetch orders for current session (INCLUDING COMPLETED)
        const queryParams: string[] = [];

        // This allows receipt download during grace period
        [
          "pending",
          "confirmed",
          "preparing",
          "ready",
          "served",
          "completed",
        ].forEach((s) => queryParams.push(`status=${s}`));

        // Pass tableId
        queryParams.push(`tableId=${tableNumber}`);

        url = `${API_BASE}/orders?${queryParams.join("&")}`;

        // CRITICAL: Session token in header
        headers["x-session-token"] = currentSessionToken;
      } else {
        // No valid auth
        //console.log('[DEBUG FETCH] No auth - returning empty');
        setPastOrders([]);
        return;
      }

      try {
        if (url.includes("?")) {
          url += `&_t=${Date.now()}`;
        } else {
          url += `?_t=${Date.now()}`;
        }

        const res = await fetch(url, { headers, cache: "no-store" });

        //console.log('[DEBUG FETCH] Response status:', res.status);

        if (!res.ok) {
          if (isAdminUser) {
            toast({ variant: "destructive", title: "Auth Error" });
          }
          //console.log('[DEBUG FETCH] Response not OK, clearing orders');
          setPastOrders([]);
          return;
        }

        if (res.status === 401 || res.status === 403) {
          if (!isAdminUser) {
            console.log(" Session expired/invalid. Clearing local token.");
            localStorage.removeItem("session_token");
            setSessionToken(null);
          }
          setPastOrders([]);
          return;
        }

        const responseData = await res.json();
        //console.log('[DEBUG FETCH] Raw response:', responseData);

        const orders: BackendOrder[] = extractArrayFromResponse(
          responseData,
          `fetchRelevantOrders`
        );

        let filteredOrders = orders;

        if (!isAdminUser) {
          // Only filter out cancelled orders for customers
          const beforeFilter = filteredOrders.length;
          filteredOrders = orders.filter((o) => {
            const status = o.order_status?.toLowerCase();

            // Only filter out cancelled orders
            if (status === "cancelled") {
              return false;
            }

            return true;
          });

          // Capture tableId from the backend response to ensure socket room matches backend logic
          if (orders.length > 0) {
            const firstOrder = orders[0];
            if (firstOrder.table_id) {
              // Verify we are not resetting it unnecessarily (though setTableId is stable)
              // casting to string
              setTableId(String(firstOrder.table_id));
            }
          }
        }

        setPastOrders(filteredOrders.map(mapBackendOrderToPastOrder));
      } catch (error) {
        console.error(`[DEBUG FETCH] Error in fetchRelevantOrders:`, error);
        setPastOrders([]);
      }
    },
    [sessionToken, tableNumber, toast, orderFilters, pathname]
  );

  // --- NEW: Fetch Active Orders (Unfiltered by Date) for Table Status ---
  const fetchActiveOrders = useCallback(async () => {
    if (!hasAuthToken()) return; // Only for admins/staff usually

    try {
      const queryParams = [
        "limit=1000", // Fetch all recent for status check
        "status=pending",
        "status=confirmed",
        "status=preparing",
        "status=ready",
        "status=served",
      ].join("&");

      const res = await fetch(`${API_BASE}/orders?${queryParams}`, {
        headers: { ...authHeaders() },
      });

      if (!res.ok) return;

      const responseData = await res.json();
      const orders: BackendOrder[] = extractArrayFromResponse(
        responseData,
        "fetchActiveOrders"
      );

      // We only need this for calculating occupancy, so raw mapping is fine
      const mapped = orders.map(mapBackendOrderToPastOrder);
      setActiveOrders(mapped);
      console.log(
        "[DEBUG ACTIVE] Fetched",
        mapped.length,
        "active orders for status check"
      );
    } catch (err) {
      console.error("[useCart] Failed to fetch active orders:", err);
    }
  }, []);

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
    if (socket || typeof window === "undefined") {
      //console.log('[DEBUG SOCKET] Socket already connected or SSR, skipping connect.');
      return;
    }

    //console.log('[DEBUG SOCKET] Attempting socket connect...');
    const isAdminConnected = hasAuthToken();

    const newSocket = io(SOCKET_URL, {
      auth: (cb) => {
        const token = localStorage.getItem("accessToken");
        cb(token ? { token } : {});
      },
    });

    setSocket(newSocket);
  }, [socket]); // Reduced dependencies as we moved logic out

  // --- Socket Event Listeners (Prevent Stale Closures) ---
  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      console.log("[DEBUG SOCKET] Connected");
      fetchRelevantOrders();
      fetchRelevantOrders();
      if (hasAuthToken()) {
        fetchTables();
        fetchKitchenOrders();
        fetchActiveOrders(); // NEW
        socket.emit("join:kitchen");
      }
    };

    const handleNewOrder = (order: BackendOrder) => {
      console.log('[DEBUG SOCKET] Event "newOrder" received', order);
      toast({
        title: "New Order!",
        description: `Table ${order?.table_id}`,
      });
      fetchRelevantOrders();
      fetchRelevantOrders();
      if (hasAuthToken()) {
        fetchKitchenOrders();
        fetchActiveOrders(); // NEW
      }
    };

    const handleStatusUpdate = (data: {
      orderId: number;
      status: string;
      tableId: string;
    }) => {
      console.log('[DEBUG SOCKET] Event "orderStatusUpdate" received', data);
      const friendlyStatus =
        data.status.charAt(0).toUpperCase() + data.status.slice(1);
      const tableMsg = data.tableId ? `Table ${data.tableId}` : "Your order";
      toast({
        title: "Order Update",
        description: `${tableMsg} is ${friendlyStatus}`,
      });
      console.log("[DEBUG SOCKET] Triggering fetchRelevantOrders()");
      fetchRelevantOrders();
      fetchRelevantOrders();
      if (hasAuthToken()) {
        fetchKitchenOrders();
        fetchActiveOrders(); // NEW
      }
    };

    const handleDisconnect = (reason: any) => {
      console.log("[DEBUG SOCKET] Socket disconnected:", reason);
    };

    const handleConnectError = (err: any) => {
      console.error("[DEBUG SOCKET] Socket connection error:", err.message);

      // Recovery: If auth error, clear bad token and retry as guest
      if (
        err.message === "Authentication error" ||
        err.message === "xhr poll error"
      ) {
        const token = localStorage.getItem("accessToken");
        if (token) {
          console.warn(
            "[DEBUG SOCKET] Clearing invalid access token and retrying..."
          );
          localStorage.removeItem("accessToken");
          // Force update auth payload for next attempt
          if (socket) {
            socket.auth = {};
            socket.connect();
          }
        }
      }
    };

    // Attach listeners
    socket.on("connect", handleConnect);
    socket.on("order:new", handleNewOrder);
    socket.on("order:statusUpdate", handleStatusUpdate);
    socket.on("disconnect", handleDisconnect);
    socket.on("connect_error", handleConnectError);

    // If socket is already connected (re-render), ensure we join/fetch if needed
    if (socket.connected) {
      // Optional: We might not want to re-fetch on every render, but we need to ensure 'join' if auth changed?
      // For now, relies on 'connect' event usually, but if we just logged in, we might need manual trigger.
      // Handled by manual calls elsewhere or page reload for auth usually.
    }

    // Cleanup
    return () => {
      socket.off("connect", handleConnect);
      socket.off("order:new", handleNewOrder);
      socket.off("order:statusUpdate", handleStatusUpdate);
      socket.off("disconnect", handleDisconnect);
      socket.off("connect_error", handleConnectError);
    };
  }, [socket, fetchRelevantOrders, fetchKitchenOrders, fetchTables, toast]);

  // Join table room when socket and tableId are ready
  useEffect(() => {
    // Use tableId if available, otherwise fallback to tableNumber (which is usually what customers have)
    const targetTable = tableId || tableNumber;

    if (socket && targetTable && !hasAuthToken()) {
      console.log("[DEBUG SOCKET] Joining table room:", targetTable);
      socket.emit("join:table", targetTable);
    }
  }, [socket, tableId, tableNumber]);

  // --- Table Status Calculation  ---
  const tableStatuses = useMemo(() => {
    const isAdminUser = hasAuthToken();
    if (!isAdminUser || !Array.isArray(backendTables)) {
      return [];
    }

    const derived = backendTables
      .filter((t: any) => t.is_available !== false)
      .map((t: any) => {
        const idStr = String(t.table_id || t.id);
        const numStr = t.table_number || idStr;
        // FIX: Strict match on Table ID only to prevent "Off-By-K" errors
        const tableOrders = activeOrders.filter((o) => o.tableId === idStr);
        const isOccupied = tableOrders.length > 0;

        let status: TableStatus["status"] = "Empty";
        if (isOccupied) {
          // Check if ALL active orders are paid
          const allPaid = tableOrders.every(
            (o) => o.paymentStatus === "Approved"
          );
          status = allPaid ? "Paid & Occupied" : "Occupied";
        }

        const totalAmount = tableOrders.reduce(
          (sum, o) => sum + (o.total || 0),
          0
        );

        // Calculate remaining outstanding (unpaid) amount
        const unpaidAmount = tableOrders.reduce((sum, o) => {
          return o.paymentStatus !== "Approved" ? sum + (o.total || 0) : sum;
        }, 0);

        // Find earliest order time
        const occupiedSince =
          tableOrders.length > 0
            ? Math.min(...tableOrders.map((o) => o.date || Date.now()))
            : undefined;

        return {
          id: t.table_id || t.id,
          tableNumber: numStr,
          capacity: t.capacity,
          qrCodeUrl: t.qr_code_url,
          isAvailable: t.is_available,
          status, // "Empty" | "Occupied" | "Paid & Occupied"
          totalAmount,
          activeOrdersCount: tableOrders.length, // Added helper
          unpaidAmount, // Added helper
          occupiedSince,
        };
      });

    return derived;
  }, [activeOrders, backendTables]); // Dependency changed pastOrders -> activeOrders

  // --- Table, Tax, Menu Management ---
  const setTable = useCallback(
    (table: string | null) => {
      setTableNumber(table);
      if (table) {
        writeToStorage("tableNumber", table);
      } else {
        if (typeof window !== "undefined") {
          localStorage.removeItem("tableNumber");
        }
      }
      // We still fetch relevant orders (which will return empty/past orders if no table)
      fetchRelevantOrders();
    },
    [fetchRelevantOrders]
  );

  const updateSettings = useCallback(
    async (
      newTax: number,
      newDiscount: number,
      newUpiId: string,
      newZomatoId?: string,
      newSwiggyId?: string,
      newName?: string,
      newAddress?: string,
      newEmail?: string,
      newTagline?: string,
      newContactNumber?: string,
      newFssaiLicNo?: string,
      newGstin?: string
    ) => {
      if (!hasAuthToken()) return;
      // Update local state
      setTaxRateState(newTax);
      setDiscountRate(newDiscount);
      setUpiId(newUpiId);
      if (newZomatoId !== undefined) setZomatoRestaurantId(newZomatoId);
      if (newSwiggyId !== undefined) setSwiggyRestaurantId(newSwiggyId);
      if (newName !== undefined) setRestaurantName(newName);
      if (newAddress !== undefined) setRestaurantAddress(newAddress);
      if (newEmail !== undefined) setContactEmail(newEmail);
      if (newTagline !== undefined) setRestaurantTagline(newTagline);
      if (newContactNumber !== undefined) setContactNumber(newContactNumber);
      if (newFssaiLicNo !== undefined) setFssaiLicNo(newFssaiLicNo);
      if (newGstin !== undefined) setGstin(newGstin);

      writeToStorage("taxRate", newTax);
      writeToStorage("discountRate", newDiscount);
      writeToStorage("upiId", newUpiId);

      try {
        console.log(
          `[DEBUG] Saving settings: Tax=${newTax}, Discount=${newDiscount}, UPI=${newUpiId}`
        );
        // Call the new unified settings endpoint
        const body: any = {
          taxRate: newTax,
          discountRate: newDiscount,
          upiId: newUpiId,
          // Ensure restaurantId is sent if needed, or backend handles it via token
        };

        // Explicitly send restaurant details if provided (for multi-tenant updates)
        // NOTE: Backend SettingsController.updateSettings might rely on req.user, but explicit passing is safer
        const authUser = getStoredRole()
          ? JSON.parse(localStorage.getItem("adminUser") || "{}")
          : null;
        const targetId =
          restaurantId ||
          (authUser?.restaurantId ? String(authUser.restaurantId) : undefined);
        if (targetId) body.restaurantId = targetId;

        if (newZomatoId !== undefined) body.zomatoRestaurantId = newZomatoId;
        if (newSwiggyId !== undefined) body.swiggyRestaurantId = newSwiggyId;
        if (newName !== undefined) body.name = newName;
        if (newAddress !== undefined) body.address = newAddress;
        if (newEmail !== undefined) body.contactEmail = newEmail;
        if (newTagline !== undefined) body.tagline = newTagline;
        if (newContactNumber !== undefined)
          body.contactNumber = newContactNumber;
        if (newFssaiLicNo !== undefined) body.fssaiLicNo = newFssaiLicNo;
        if (newGstin !== undefined) body.gstin = newGstin;

        const res = await fetch(`${API_BASE}/settings`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(body),
        });

        if (!res.ok) {
          const errData = await res
            .json()
            .catch(() => ({ message: "Unknown error" }));
          throw new Error(errData.message);
        }

        const data = await res.json();
        console.log("[DEBUG] Settings saved.", data);

        // Check for Slug Change
        const updatedRest = data.data?.updatedRestaurant;
        if (
          updatedRest &&
          updatedRest.slug &&
          updatedRest.slug !== restaurantSlug
        ) {
          console.log(
            `[DEBUG SLUG] Slug changed from ${restaurantSlug} to ${updatedRest.slug}`
          );
          toast({
            title: "URL Changed!",
            description: "Restaurant name changed. Redirecting to new URL...",
            duration: 5000,
          });

          // Update slug in state and storage
          // Update slug in state and storage
          setRestaurantSlugState(updatedRest.slug);
          writeToStorage("restaurantSlug", updatedRest.slug);

          // Redirect
          setTimeout(() => {
            window.location.href = `/${updatedRest.slug}/dashboard/settings`;
          }, 2000);
        }
      } catch (error) {
        console.error("Failed to save settings:", error);
        toast({
          variant: "destructive",
          title: "Save Failed",
          description: (error as Error).message,
        });
      }
    },
    [toast]
  );

  // Backward compatibility wrapper for setTaxRate
  const setTaxRate = useCallback(
    async (newRate: number) => {
      await updateSettings(newRate, discountRate, upiId);
    },
    [updateSettings, discountRate, upiId]
  );

  const setMenuItems = useCallback((items: MenuItem[]) => {
    if (!hasAuthToken()) return;
    setMenuItemsState(items);
    writeToStorage("menuItems", items);
  }, []);

  // --- Cart Management (Local State) ---
  const addToCart = useCallback(
    (item: MenuItem) => {
      if (!item.isAvailable) {
        toast({
          variant: "destructive",
          title: "Item Unavailable",
          description: `${item.name} is out of stock.`,
        });
        return;
      }

      setCart((prev) => {
        const existing = prev.find((i) => i.id === item.id);
        const updated = existing
          ? prev.map((i) =>
              i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
            )
          : [...prev, { ...item, quantity: 1 }];
        writeToStorage("cart", updated);
        return updated;
      });

      toast({
        title: "Added to Cart",
        description: `${item.name} added.`,
      });
    },
    [toast]
  );

  const removeFromCart = useCallback(
    (itemId: string) => {
      setCart((prev) => {
        const updated = prev.filter((i) => i.id !== itemId);
        writeToStorage("cart", updated);
        return updated;
      });
      toast({
        title: "Item Removed",
        variant: "destructive",
      });
    },
    [toast]
  );

  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      if (quantity <= 0) {
        removeFromCart(itemId);
      } else {
        setCart((prev) => {
          const updated = prev.map((i) =>
            i.id === itemId ? { ...i, quantity } : i
          );
          writeToStorage("cart", updated);
          return updated;
        });
      }
    },
    [removeFromCart]
  );

  const updateItemInstructions = useCallback(
    (itemId: string, instructions: string) => {
      setCart((prev) => {
        const updated = prev.map((i) =>
          i.id === itemId ? { ...i, specialInstructions: instructions } : i
        );
        writeToStorage("cart", updated);
        return updated;
      });
    },
    []
  );

  const clearCart = useCallback(() => {
    setCart([]);
    writeToStorage("cart", []);
  }, []);

  const getTotalPrice = useCallback(
    () => cart.reduce((total, item) => total + item.price * item.quantity, 0),
    [cart]
  );

  // --- REPEAT ORDER FUNCTION ---
  const repeatOrder = useCallback(
    async (orderId: string) => {
      const orderToRepeat = pastOrders.find((o) => o.id === orderId);
      if (!orderToRepeat) return;

      setIsCartLoading(true);
      try {
        // 1. Fetch live menu
        const query = restaurantId ? `?restaurantId=${restaurantId}` : "";
        const res = await fetch(`${API_BASE}/menu${query}`);
        if (!res.ok) throw new Error("Failed to fetch menu");

        const rawData = await res.json();
        let menuArray: any[] = [];
        if (Array.isArray(rawData)) menuArray = rawData;
        else if (Array.isArray(rawData?.data)) menuArray = rawData.data;
        else if (Array.isArray(rawData?.items)) menuArray = rawData.items;

        const itemsToAdd: CartItem[] = [];

        // 2. Match past items with live menu
        orderToRepeat.items.forEach((pastItem) => {
          const liveItemRaw = menuArray.find(
            (m) => String(m.item_id || m.id) === String(pastItem.id)
          );

          if (liveItemRaw) {
            const isAvailable =
              liveItemRaw.is_available === true ||
              liveItemRaw.is_available === "true" ||
              Number(liveItemRaw.is_available) === 1;

            if (isAvailable) {
              const imageRaw = liveItemRaw.image_url || liveItemRaw.image;
              const imageUrl = imageRaw
                ? String(imageRaw).startsWith("http")
                  ? imageRaw
                  : `${API_BASE}${imageRaw}`
                : "https://placehold.co/300x300";

              itemsToAdd.push({
                id: String(liveItemRaw.item_id || liveItemRaw.id),
                name: liveItemRaw.name,
                description: liveItemRaw.description || "",
                price: parseFloat(liveItemRaw.price),
                image: { url: imageUrl, hint: "" },
                category: liveItemRaw.category || "Uncategorized",
                isAvailable: true,
                isVegetarian: !!liveItemRaw.is_vegetarian,
                preparationTime: liveItemRaw.preparation_time,
                quantity: pastItem.quantity,
                specialInstructions: "",
                spiceLevel: (pastItem as any).spiceLevel || null, // Added
              });
            }
          }
        });

        if (itemsToAdd.length === 0) {
          toast({
            variant: "destructive",
            title: "Unavailable",
            description: "Items no longer available.",
          });
        } else {
          // 3. Add to Cart
          setCart((prevCart) => {
            const newCart = [...prevCart];
            itemsToAdd.forEach((newItem) => {
              const existingIndex = newCart.findIndex(
                (i) => i.id === newItem.id
              );
              if (existingIndex > -1) {
                newCart[existingIndex].quantity += newItem.quantity;
              } else {
                newCart.push(newItem);
              }
            });
            writeToStorage("cart", newCart);
            return newCart;
          });
          toast({
            title: "Order Repeated",
            description: "Items added to cart.",
          });
          router.push("/cart");
        }
      } catch (error) {
        console.error("Repeat Error:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Could not repeat order.",
        });
      } finally {
        setIsCartLoading(false);
      }
    },
    [pastOrders, toast, router]
  );

  // --- Order API Functions ---
  // Replace the placeOrder function in CartProvider

  const placeOrder = useCallback(
    async (
      total: number,
      customer: { name: string; phone: string; email?: string }
    ): Promise<boolean> => {
      if (isSubmittingRef.current) {
        //console.log('[DEBUG PLACE ORDER] Ignoring duplicate request');
        return false;
      }
      if (isCartLoading) {
        //console.log('[DEBUG PLACE ORDER] Already processing, ignoring duplicate request');
        return false;
      }

      if (!tableNumber) {
        toast({
          variant: "destructive",
          title: "No Table Selected",
          description: "Please scan a table QR code first.",
        });
        return false;
      }

      // Fallback: If tableId is missing but tableNumber is numeric, might try to use it (risky but better than nothing for legacy tests)
      // Ideally, rely ONLY on tableId.
      const targetTableId = tableId
        ? parseInt(tableId, 10)
        : parseInt(tableNumber, 10);

      if (isNaN(targetTableId)) {
        toast({
          variant: "destructive",
          title: "Invalid Table",
          description: "Could not determine table ID. Please Rescan QR.",
        });
        return false;
      }

      setIsCartLoading(true);

      const hasActiveOrder = pastOrders.some(
        (o) =>
          o.tableNumber === tableId && // Checking against tableId (stored as tableNumber in partial mapped object? No, pastOrder.tableNumber maps to order.table_id)
          o.status !== "Completed" &&
          o.status !== "Cancelled"
      );
      // Correction: mapBackendOrderToPastOrder line 172: tableNumber: String(order.table_id).
      // So checking o.tableNumber === tableId is correct (both strings of ID).

      const orderType = hasActiveOrder ? "addon" : "regular";

      const orderPayload = {
        tableId: targetTableId,
        items: cart.map((item) => ({
          itemId: parseInt(item.id, 10),
          quantity: item.quantity,
          specialInstructions: item.specialInstructions || null,
          spiceLevel: item.spiceLevel || null, // Added
        })),
        customerName: customer.name,
        customerPhone: customer.phone,
        restaurantId: restaurantId ? parseInt(restaurantId, 10) : undefined, // Added for centralization
        orderType,
      };

      //console.log('[DEBUG PLACE ORDER] Payload:', orderPayload);
      //console.log('[DEBUG PLACE ORDER] Current sessionToken:', sessionToken);

      try {
        const res = await fetch(`${API_BASE}/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify(orderPayload),
        });

        const data = await res.json().catch(() => null);
        console.log("[DEBUG PLACE ORDER] Response:", data);

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
            localStorage.setItem("session_token", token);
            //console.log('[DEBUG PLACE ORDER] Saved session_token to localStorage');
          } catch (e) {
            //console.warn('[DEBUG PLACE ORDER] Could not write session_token to localStorage', e);
          }
        } else {
          //console.warn('[DEBUG PLACE ORDER] No session_token found in response');
        }

        // Capture tableId from response if available (Corrects socket room if tableNumber != tableId)
        if (data?.data?.order?.table_id) {
          setTableId(String(data.data.order.table_id));
        }

        // Clear cart and show success
        clearCart();
        toast({
          title: hasActiveOrder ? "Add-on Placed!" : "Order Placed!",
          description: "Your order has been sent to the kitchen.",
        });

        // Save customer details
        setCustomerDetails({ name: customer.name, phone: customer.phone });
        writeToStorage("Five_petals_customer", customer);

        // Refresh orders
        console.log(
          "[DEBUG PLACE ORDER] Fetching orders after successful placement..."
        );
        await fetchRelevantOrders();

        return true;
      } catch (err) {
        console.error("[DEBUG PLACE ORDER] Failed to place order:", err);
        toast({
          variant: "destructive",
          title: "Order Failed",
          description: (err as Error).message,
        });
        return false;
      } finally {
        // Always reset loading state
        isSubmittingRef.current = false;
        setIsCartLoading(false);
        //console.log('[DEBUG PLACE ORDER] Order placement complete');
      }
    },
    [
      tableNumber,
      cart,
      clearCart,
      toast,
      fetchRelevantOrders,
      advancedAnalytics,
      fetchAdvancedAnalytics,
      advancedDateRange,
      setAdvancedDateRange,
      pastOrders,
      isCartLoading,
      sessionToken,
    ]
  );

  // --- Admin/Kitchen Order Actions ---
  const updateKitchenOrderStatus = useCallback(
    async (orderId: string, from: KitchenStatus, to: KitchenStatus) => {
      if (!hasAuthToken()) return;

      let newBackendStatus: string | null = null;
      if (from === "new") {
        newBackendStatus = "preparing";
      } else if (from === "in-progress") {
        newBackendStatus = "ready";
      } else if (from === "completed") {
        newBackendStatus = "served";
      }

      if (!newBackendStatus) {
        console.error("Invalid status transition from:", from);
        return;
      }

      console.log(
        `[DEBUG updateStatus] Requesting change to: ${newBackendStatus} for order ${orderId}`
      );

      try {
        const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ status: newBackendStatus }),
        });

        console.log("[DEBUG updateStatus] Response status:", res.status);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({
            message: `Update failed (${res.status})`,
          }));
          throw new Error(errData.message);
        }

        toast({
          title: "Status Updated!",
          description: `Order is now ${newBackendStatus}`,
        });

        console.log(
          "[DEBUG updateStatus] Forcing fetchKitchenOrders after successful update."
        );
        fetchKitchenOrders();
      } catch (err) {
        console.error("Failed to update order status:", err);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: (err as Error).message,
        });
      }
    },
    [toast, fetchKitchenOrders]
  );

  const requestPayment = useCallback(
    async (orderId: string, method: "Cash" | "UPI") => {
      try {
        const res = await fetch(
          `${API_BASE}/orders/${orderId}/payment-request`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              paymentStatus: "Requested",
              paymentMethod: method,
            }),
          }
        );

        if (!res.ok) throw new Error("Failed to request payment");

        await fetchRelevantOrders();

        if (method === "Cash") {
          toast({
            title: "Waiter Notified",
            description: "Please wait for a staff member to collect cash.",
          });
        } else {
          toast({
            title: "Payment Sent",
            description: "Please wait for confirmation.",
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Request Failed",
          description: "Could not notify staff. Please try again.",
        });
      }
    },
    [toast, fetchRelevantOrders]
  );

  const approvePayment = useCallback(
    async (orderId: string) => {
      if (!hasAuthToken()) return;

      console.log(
        `[DEBUG approvePayment] Approving payment for order ${orderId}`
      );

      try {
        const res = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ paymentStatus: "Approved" }),
        });

        console.log("[DEBUG approvePayment] Response status:", res.status);

        if (!res.ok) {
          const errData = await res.json().catch(() => ({
            message: `Approval failed (Status ${res.status})`,
          }));
          throw new Error(errData.message || "Failed to approve payment");
        }

        fetchRelevantOrders();
        toast({
          title: "Payment Approved",
          description: `Order #${orderId.slice(-4)} marked as paid.`,
        });
      } catch (err) {
        console.error("Failed to approve payment:", err);
        toast({
          variant: "destructive",
          title: "Approval Failed",
          description: (err as Error).message,
        });
      }
    },
    [toast, fetchRelevantOrders]
  );

  const updatePaymentMethod = useCallback(
    async (orderId: string, method: string, status: string = "Approved") => {
      if (!hasAuthToken()) return;
      try {
        const res = await fetch(`${API_BASE}/orders/${orderId}/payment`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            paymentStatus: status,
            paymentMethod: method,
          }),
        });
        if (!res.ok) throw new Error("Failed to update payment method");

        fetchRelevantOrders();
        toast({
          title: "Payment Updated",
          description: `Method set to ${method}`,
        });
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: "Could not update payment method.",
        });
      }
    },
    [toast, fetchRelevantOrders]
  );

  const settleTable = useCallback(
    async (tableId: number | string, method: string) => {
      if (!hasAuthToken()) return;

      const idStr = String(tableId);
      const unpaidOrders = activeOrders.filter(
        (o) =>
          o.tableId === idStr &&
          o.paymentStatus !== "Approved" &&
          o.status !== "Cancelled"
      );

      if (unpaidOrders.length === 0) {
        toast({ title: "No unpaid orders to settle." });
        return;
      }

      let successCount = 0;
      for (const order of unpaidOrders) {
        try {
          const res = await fetch(`${API_BASE}/orders/${order.id}/payment`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json", ...authHeaders() },
            body: JSON.stringify({
              paymentStatus: "Approved",
              paymentMethod: method,
            }),
          });
          if (res.ok) successCount++;
        } catch (e) {
          console.error(`Failed to settle order ${order.id}`, e);
        }
      }

      if (successCount > 0) {
        toast({
          title: "Table Settled",
          description: `Marked ${successCount} orders as Paid via ${method}`,
        });
        fetchRelevantOrders();
      } else {
        toast({
          variant: "destructive",
          title: "Settlement Failed",
          description: "Could not update orders.",
        });
      }
    },
    [activeOrders, toast, fetchRelevantOrders]
  );

  const cancelOrder = useCallback(
    async (orderId: string) => {
      const isAdminUser = hasAuthToken();
      const isMyTableOrder = pastOrders.some(
        (o) => o.id === orderId && o.tableNumber === tableNumber
      );

      if (!isAdminUser && !isMyTableOrder) {
        toast({ variant: "destructive", title: "Unauthorized" });
        return;
      }

      try {
        const headers = isAdminUser
          ? authHeaders()
          : { "Content-Type": "application/json" };

        const res = await fetch(`${API_BASE}/orders/${orderId}/cancel`, {
          method: "PATCH",
          headers,
        });

        if (!res.ok) throw new Error("Failed to cancel order");

        fetchRelevantOrders();
        toast({
          title: "Order Cancelled",
          description: `Order #${orderId.slice(-6)} cancelled.`,
        });
      } catch (err) {
        console.error("Failed to cancel order:", err);
        toast({
          variant: "destructive",
          title: "Cancel Failed",
          description: (err as Error).message,
        });
      }
    },
    [toast, fetchRelevantOrders, pastOrders, tableNumber]
  );

  // --- Table API Function ---
  const createTable = useCallback(
    async (tableNumStr: string, capacityNum: number): Promise<boolean> => {
      if (!hasAuthToken()) {
        toast({ variant: "destructive", title: "Unauthorized" });
        return false;
      }

      console.log(
        `[DEBUG] Attempting to create table: Number=${tableNumStr}, Capacity=${capacityNum}`
      );

      const authUser = getStoredRole()
        ? JSON.parse(localStorage.getItem("adminUser") || "{}")
        : null;
      const targetRestaurantId =
        restaurantId ||
        (authUser?.restaurantId ? String(authUser.restaurantId) : null);

      if (!targetRestaurantId) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Restaurant ID missing.",
        });
        return false;
      }

      try {
        const res = await fetch(`${API_BASE}/tables`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({
            tableNumber: tableNumStr,
            capacity: capacityNum,
            restaurantId: targetRestaurantId,
          }),
        });

        console.log("[DEBUG] Create table response status:", res.status);

        if (!res.ok) {
          const err = await res.json();
          console.error("[DEBUG] Create table error:", err);
          throw new Error(err.message || "Failed to create table");
        }

        await fetchTables();
        toast({
          title: "Table Created",
          description: `Table ${tableNumStr} added.`,
        });
        return true;
      } catch (err) {
        console.error("[DEBUG] Failed to create table:", err);
        toast({
          variant: "destructive",
          title: "Creation Failed",
          description: (err as Error).message,
        });
        return false;
      }
    },
    [toast, fetchTables]
  );

  const deleteTable = useCallback(
    async (tableId: number): Promise<boolean> => {
      if (!hasAuthToken()) {
        toast({ variant: "destructive", title: "Unauthorized" });
        return false;
      }

      try {
        const res = await fetch(`${API_BASE}/tables/${tableId}`, {
          method: "DELETE",
          headers: {
            ...authHeaders(),
          },
        });

        console.log("[DEBUG] Delete table response status:", res.status);

        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          console.error("[DEBUG] Delete table error:", err);
          throw new Error((err as any).message || "Failed to delete table");
        }

        await fetchTables();
        toast({
          title: "Table Deleted",
          description: "Table, QR code, and active orders were removed.",
        });
        return true;
      } catch (err) {
        console.error("[DEBUG] Failed to delete table:", err);
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: (err as Error).message,
        });
        return false;
      }
    },
    [toast, fetchTables]
  );

  const clearTableSession = useCallback(
    async (tableId: number) => {
      if (!hasAuthToken()) return;
      try {
        const res = await fetch(`${API_BASE}/tables/${tableId}/clear`, {
          method: "POST",
          headers: { ...authHeaders() },
        });

        if (!res.ok) throw new Error("Failed to clear table");

        toast({
          title: "Table Cleared",
          description: "Session expired and table is free.",
        });
        await fetchTables();
        await fetchActiveOrders();
      } catch (e) {
        toast({
          variant: "destructive",
          title: "Failed",
          description: "Could not clear table.",
        });
      }
    },
    [toast, fetchTables, fetchActiveOrders]
  );

  const updateSessionTotal = useCallback(
    async (sessionId: string, newTotal: number) => {
      try {
        const res = await fetch(
          `${API_BASE}/orders/session/${sessionId}/total`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              ...authHeaders(),
            },
            body: JSON.stringify({ total: newTotal }),
          }
        );

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.message || "Failed to update total");
        }

        // Refresh orders to show new calculations
        fetchRelevantOrders();

        toast({
          title: "Total Updated",
          description: `Session total has been overridden to ₹${newTotal.toFixed(
            2
          )}`,
        });
      } catch (err) {
        console.error("[useCart] Failed to update session total:", err);
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: (err as Error).message,
        });
        throw err;
      }
    },
    [fetchRelevantOrders, toast]
  );

  // --- Analytics Calculation (Local - admin only) ---
  const analytics = useMemo(() => {
    if (!hasAuthToken() || !Array.isArray(pastOrders)) {
      return defaultAnalytics;
    }

    // Only count Approved orders for Revenue
    const approvedOrders = pastOrders.filter(
      (o) => o.paymentStatus === "Approved"
    );

    // For "New Orders" count, we should arguably count ALL orders (including pending)
    // OR just the ones in the period.
    // The previous logic filtered "approvedOrders" for everything.
    // Let's stick to "approvedOrders" for Revenue, but for "New Orders" count,
    // usually business owners want to see TOTAL sessions, including active/pending ones?
    // However, the Card says "New Orders" inside a "Total Revenue" context usually implies conversion.
    // But let's look at the user request: "in analytics new orders... should treat whole as 1 single order".
    // If they are paying ("click payment"), they become Approved.
    // So working with "approvedOrders" is likely what they are looking at in the screenshot (Revenue & New Orders).

    const { start: todayStart, end: todayEnd } = getISTDayRange(); // Defaults to now

    // Helper to convert Fake Local Date (from date-fns helpers) to Absolute IST Epoch
    const toEpoch = (fakeLocal: Date, isEnd = false) => {
      const iso = format(fakeLocal, "yyyy-MM-dd'T'HH:mm:ss.SSS") + "+05:30";
      return new Date(iso).getTime();
    };

    const nowFake = toISTDisplayDate(Date.now());

    const getPeriodInterval = (period: AnalyticsPeriod) => {
      if (period === "daily") {
        return { start: todayStart, end: todayEnd };
      }
      if (period === "weekly") {
        return {
          start: toEpoch(startOfWeek(nowFake, { weekStartsOn: 1 })),
          end: toEpoch(endOfWeek(nowFake, { weekStartsOn: 1 })),
        };
      }
      if (period === "monthly") {
        return {
          start: toEpoch(startOfMonth(nowFake)),
          end: toEpoch(endOfMonth(nowFake)),
        };
      }
      // All time
      return { start: 0, end: Date.now() };
    };

    const { start, end } = getPeriodInterval(analyticsPeriod);

    // Filter orders by date
    const periodOrders = approvedOrders.filter(
      (o) => o.date >= start && o.date <= end
    );

    const totalRevenue = periodOrders.reduce(
      (sum, order) => sum + order.total,
      0
    );

    // DEBUG LOGGING for Analytics
    // console.log(`[DEBUG ANALYTICS] Period: ${analyticsPeriod}, Orders found: ${periodOrders.length}`);

    // Count unique sessions instead of total orders
    const uniqueSessions = new Set();

    periodOrders.forEach((o) => {
      const sid = (o as any).sessionId || (o as any).session_id;
      if (sid) {
        uniqueSessions.add(sid);
      } else {
        // Fallback: If no session ID, valid orders must be counted by ID
        // console.warn('[DEBUG ANALYTICS] Order missing session ID:', o.id);
        uniqueSessions.add(o.id);
      }
    });

    const newOrdersCount = uniqueSessions.size;

    // console.log(`[DEBUG ANALYTICS] Unique Sessions: ${newOrdersCount}`);

    const avgOrderValue =
      newOrdersCount > 0 ? totalRevenue / newOrdersCount : 0;

    return {
      totalRevenue,
      newOrders: newOrdersCount,
      avgOrderValue,
      revenueChangeText: `vs previous ${analyticsPeriod}`,
      ordersChangeText: `this ${analyticsPeriod}`,
      avgValueChangeText: `this ${analyticsPeriod}`,
    };
  }, [pastOrders, analyticsPeriod]);

  const salesData = useMemo(() => {
    if (!hasAuthToken() || !Array.isArray(pastOrders)) return [];

    const nowFake = toISTDisplayDate(Date.now());
    const approvedOrders = pastOrders.filter(
      (o) => o.paymentStatus === "Approved"
    );

    // Initialize map keys using Fake Local Date (for iteration)
    let intervalFake: { start: Date; end: Date };
    let formatKey = "E";
    let dateData: Record<string, number> = {};

    if (analyticsPeriod === "daily") {
      intervalFake = { start: startOfToday(), end: endOfToday() }; // Uses local system time, effectively iterating 00-23 hours
      // Better: Construct from IST fake
      intervalFake = { start: startOfDay(nowFake), end: endOfDay(nowFake) };
      formatKey = "HH:00";
      try {
        dateData = eachHourOfInterval(intervalFake).reduce(
          (acc, hour) => ({ ...acc, [format(hour, "HH:00")]: 0 }),
          {}
        );
      } catch (e) {
        dateData = {};
      }
    } else if (analyticsPeriod === "weekly") {
      intervalFake = {
        start: startOfWeek(nowFake, { weekStartsOn: 1 }),
        end: endOfWeek(nowFake, { weekStartsOn: 1 }),
      };
      formatKey = "E";
      dateData = eachDayOfInterval(intervalFake).reduce(
        (acc, day) => ({ ...acc, [format(day, "E")]: 0 }),
        {}
      );
    } else if (analyticsPeriod === "monthly") {
      intervalFake = { start: startOfMonth(nowFake), end: endOfMonth(nowFake) };
      formatKey = "d";
      dateData = eachDayOfInterval(intervalFake).reduce(
        (acc, day) => ({ ...acc, [format(day, "d")]: 0 }),
        {}
      );
    } else {
      intervalFake = { start: startOfYear(nowFake), end: endOfYear(nowFake) };
      formatKey = "MMM";
      dateData = eachMonthOfInterval(intervalFake).reduce(
        (acc, month) => ({ ...acc, [format(month, "MMM")]: 0 }),
        {}
      );
    }

    // Filter using Absolute IST Epochs logic
    // We reuse the logic from analytics useMemo or duplicate it here for safety
    const toEpoch = (fakeLocal: Date) => {
      const iso = format(fakeLocal, "yyyy-MM-dd'T'HH:mm:ss.SSS") + "+05:30";
      return new Date(iso).getTime();
    };

    const startEpoch = toEpoch(intervalFake.start);
    const endEpoch = toEpoch(intervalFake.end);

    const filteredOrders = approvedOrders.filter(
      (o) => o.date >= startEpoch && o.date <= endEpoch
    );

    filteredOrders.forEach((order) => {
      // Convert Order Epoch to IST Fake Local for formatting
      const istDate = toISTDisplayDate(order.date);
      const key = format(istDate, formatKey);
      if (dateData[key] !== undefined) {
        dateData[key] += order.total;
      }
    });

    return Object.entries(dateData).map(([name, sales]) => ({
      name,
      sales: Math.round(sales),
    }));
  }, [pastOrders, analyticsPeriod]);

  // --- Payment Stats Calculation ---
  const paymentStats = useMemo(() => {
    if (!hasAuthToken() || !Array.isArray(pastOrders)) return [];

    const nowFake = toISTDisplayDate(Date.now());
    const approvedOrders = pastOrders.filter(
      (o) => o.paymentStatus === "Approved"
    );

    const toEpoch = (fakeLocal: Date) => {
      const iso = format(fakeLocal, "yyyy-MM-dd'T'HH:mm:ss.SSS") + "+05:30";
      return new Date(iso).getTime();
    };

    const getPeriodInterval = (period: AnalyticsPeriod) => {
      if (period === "daily") {
        const { start, end } = getISTDayRange();
        return { start, end };
      }
      if (period === "weekly") {
        return {
          start: toEpoch(startOfWeek(nowFake, { weekStartsOn: 1 })),
          end: toEpoch(endOfWeek(nowFake, { weekStartsOn: 1 })),
        };
      }
      if (period === "monthly") {
        return {
          start: toEpoch(startOfMonth(nowFake)),
          end: toEpoch(endOfMonth(nowFake)),
        };
      }
      return {
        start: toEpoch(startOfYear(nowFake)),
        end: toEpoch(endOfYear(nowFake)),
      };
    };

    const { start, end } = getPeriodInterval(analyticsPeriod);
    const periodOrders = approvedOrders.filter(
      (o) => o.date >= start && o.date <= end
    );

    const stats: Record<string, { value: number; count: number }> = {};

    periodOrders.forEach((order) => {
      const method = order.paymentMethod || "Unknown";
      if (!stats[method]) {
        stats[method] = { value: 0, count: 0 };
      }
      stats[method].value += order.total;
      stats[method].count += 1;
    });

    return Object.entries(stats).map(([name, data]) => ({
      name,
      value: data.value,
      count: data.count,
    }));
  }, [pastOrders, analyticsPeriod]);

  // --- Provide State and Actions through Context ---

  const moveTable = useCallback(
    async (sourceTableId: number, targetTableId: number) => {
      try {
        const res = await fetch(`${API_BASE}/tables/move`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
          },
          body: JSON.stringify({ sourceTableId, targetTableId }),
        });
        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.message || "Failed to move table");
        }
        // Refresh data after move
        await fetchTables();
        await fetchActiveOrders();
        return true;
      } catch (err) {
        console.error("[useCart] Move table error:", err);
        throw err;
      }
    },
    [fetchTables, fetchActiveOrders]
  );

  const refreshTables = useCallback(async () => {
    await fetchTables();
    await fetchActiveOrders();
  }, [fetchTables, fetchActiveOrders]);

  const value = {
    cart,
    addToCart,
    removeFromCart,
    updateQuantity,
    updateItemInstructions,
    clearCart,
    getTotalPrice,
    placeOrder,
    repeatOrder,
    pastOrders,
    kitchenOrders,
    updateKitchenOrderStatus,
    requestPayment,
    approvePayment,
    updatePaymentMethod,
    cancelOrder,
    taxRate,
    discountRate,
    upiId,
    zomatoRestaurantId,
    swiggyRestaurantId,
    updateSettings,
    setTaxRate,
    restaurantName,
    restaurantAddress,
    restaurantTagline,
    contactEmail,
    contactNumber,
    fssaiLicNo,
    gstin,
    customerDetails,
    menuItems,
    setMenuItems,
    analytics,
    salesData,
    paymentStats, // Added
    isCartLoading,
    tableNumber,
    setTable: useCallback((t: string | null) => setTableNumber(t), []),
    tableStatuses,
    createTable,
    deleteTable,
    clearTableSession,
    settleTable, // Added
    moveTable,
    refreshTables,
    analyticsPeriod,
    setAnalyticsPeriod,
    connectSocket,
    restaurantId,
    setRestaurantId: useCallback((id: string) => {
      setRestaurantIdState(id);
      writeToStorage("restaurantId", id);
    }, []),
    tableId,
    setTableId,
    restaurantSlug,
    setRestaurantSlug: useCallback((slug: string) => {
      //console.log("[DEBUG CONTEXT] setRestaurantSlug called with:", slug);
      setRestaurantSlugState(slug);
      writeToStorage("restaurantSlug", slug);
    }, []),
    tableToken,
    setTableToken: useCallback((token: string) => {
      //console.log("[DEBUG CONTEXT] setTableToken called with:", token);
      setTableTokenState(token);
      writeToStorage("tableToken", token);
    }, []),

    updateSessionTotal,
    orderFilters,
    setOrderFilters,
    isTablesLoading,
    fetchRelevantOrders, // Exposed
    advancedAnalytics,
    fetchAdvancedAnalytics,
    advancedDateRange,
    setAdvancedDateRange,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

// --- Custom Hook to Use Cart Context ---
export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
