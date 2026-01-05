"use client";

import { useEffect, useState, useMemo } from "react";
import { MenuContent } from "@/components/menu/menu-content";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import {
  Banknote,
  Minus,
  Plus,
  Trash2,
  ArrowLeft,
  CreditCard,
  Printer,
  RotateCcw,
  FileText,
  Loader2,
} from "lucide-react";
import { generateBillPDF } from "@/lib/bill-generator";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";
import { MenuItem, PastOrder } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";

interface TableDetailsProps {
  tableId: string;
  slug: string;
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");

export function TableDetails({ tableId, slug }: TableDetailsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { adminUser } = useAuth();
  const {
    setTable,
    clearCart,
    pastOrders: originalPastOrders,
    activeOrders,
    clearTableSession,
    updatePaymentMethod,
    tableNumber,
    tableStatuses,
    isTablesLoading,
    setTableId,
    cancelOrder,
    fetchRelevantOrders,
    menuItems, // Use menu items to enrich display
    restaurantId, // To get restaurant ID for order payload
    taxRate,
    discountRate,
    restaurantName,
    restaurantAddress,
    contactNumber,
    fssaiLicNo,
    gstin,
    restaurantTagline,
  } = useCart();

  // --- Resolve Table ID from URL Param (which is now Table Number) ---
  const [activeTable, setActiveTable] = useState<{
    id: number;
    tableNumber: string;
    status: string;
    customerName?: string;
    customerPhone?: string;
  } | null>(null);

  const [localCustomerName, setLocalCustomerName] = useState("");
  const [localCustomerPhone, setLocalCustomerPhone] = useState("");
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  useEffect(() => {
    if (isTablesLoading || !tableStatuses || tableStatuses.length === 0) return;

    const targetTableNumber = tableId;
    const foundTable = tableStatuses.find(
      (t) => t.tableNumber === targetTableNumber
    );

    if (foundTable) {
      setActiveTable({
        id: foundTable.id,
        tableNumber: foundTable.tableNumber,
        status: foundTable.status,
        customerName: foundTable.customerName,
        customerPhone: foundTable.customerPhone,
      });

      // Sync Context
      setTableId(String(foundTable.id));
      setTable(foundTable.tableNumber);

      // Explicitly fetch orders for this table to bypass global limits/filters
      fetchRelevantOrders(undefined, String(foundTable.id));
    } else {
      console.warn(
        `[TableDetails] Table Number ${targetTableNumber} not found in statuses.`
      );
    }
  }, [tableId, tableStatuses, isTablesLoading, setTable, setTableId]);

  // --- Combine and Filter Orders for Immediate Load ---
  // Combine originalPastOrders (fetched on mount) with activeOrders (already in memory from dashboard)
  const combinedOrders = useMemo(() => {
    const map = new Map<string, PastOrder>();
    // Add active orders first (immediate availability)
    activeOrders?.forEach((o) => map.set(o.id, o));
    // Add past orders (potentially more complete/historical)
    originalPastOrders?.forEach((o) => map.set(o.id, o));
    return Array.from(map.values());
  }, [originalPastOrders, activeOrders]);

  // Filter orders using the RESOLVED Database ID
  const pastOrders = useMemo(() => {
    return combinedOrders.filter(
      (o) =>
        ((activeTable &&
          (o.tableId === String(activeTable.id) ||
            o.tableNumber === activeTable.tableNumber)) ||
          (!activeTable &&
            (o.tableId === tableId || o.tableNumber === tableId))) && // Fallback
        // Filter out 'settled' orders (Paid AND (Served OR Completed))
        !(
          o.paymentStatus === "Approved" &&
          (o.status === "Served" || o.status === "Completed")
        )
    );
  }, [combinedOrders, activeTable, tableId]);

  // --- Sync Customer Details from Backend (Table Status) ---
  useEffect(() => {
    if (activeTable) {
      // If backend provides details, load them
      // We check if local state is empty to avoid overwriting user typing
      const backendName = activeTable.customerName || "";
      const backendPhone = activeTable.customerPhone || "";

      // Only set if we haven't set it yet, or if it matches what we expect from backend
      // But we want to allow user to edit.
      // Strategy: On mount (or table switch), load from backend.
      if (!isDataLoaded) {
        setLocalCustomerName(backendName);
        setLocalCustomerPhone(backendPhone);
        setIsDataLoaded(true);
      }
    }
  }, [activeTable, isDataLoaded]);

  // Persist details to backend on change (Debounced)
  useEffect(() => {
    if (!activeTable || !isDataLoaded) return;

    const timeoutId = setTimeout(async () => {
      // Only update if changed from what backend has?
      // Or just send update. Backend handles it.
      // We avoid sending empty default "Admin" if it's not user entered.

      // Compare with current backend state to avoid redundant calls?
      // activeTable.customerName might lag behind.

      if (
        localCustomerName !== activeTable.customerName ||
        localCustomerPhone !== activeTable.customerPhone
      ) {
        try {
          const token = localStorage.getItem("accessToken");
          const headers: Record<string, string> = {
            "Content-Type": "application/json",
          };
          if (token) headers["Authorization"] = `Bearer ${token}`;

          await fetch(`${API_BASE}/tables/${activeTable.id}/customer`, {
            method: "PATCH",
            headers,
            body: JSON.stringify({
              customerName: localCustomerName,
              customerPhone: localCustomerPhone,
            }),
          });
          // Optional: refresh tables to sync state?
          // For now, we assume local state is source of truth until refresh.
        } catch (e) {
          console.error("Failed to sync customer details", e);
        }
      }
    }, 1000); // 1 sec debounce

    return () => clearTimeout(timeoutId);
  }, [localCustomerName, localCustomerPhone, activeTable, isDataLoaded]);

  // Sync customer details from orders if available AND backend is empty (First time inference)
  useEffect(() => {
    if (pastOrders.length > 0 && activeTable && isDataLoaded) {
      if (!activeTable.customerName && !activeTable.customerPhone) {
        // Backend empty, check orders
        const firstWithDetails = pastOrders.find(
          (o) => o.userName || o.userPhone
        );
        if (firstWithDetails) {
          // Found details in order, update local state (which triggers backend sync)
          if (
            !localCustomerName &&
            firstWithDetails.userName &&
            firstWithDetails.userName !== "Admin"
          )
            setLocalCustomerName(firstWithDetails.userName);

          if (
            !localCustomerPhone &&
            firstWithDetails.userPhone &&
            firstWithDetails.userPhone !== "0000000000"
          )
            setLocalCustomerPhone(firstWithDetails.userPhone);
        }
      }
    }
  }, [
    pastOrders,
    activeTable,
    isDataLoaded,
    localCustomerName,
    localCustomerPhone,
  ]);

  const totalUnpaidAmount = pastOrders.reduce((sum, order) => {
    if (order.paymentStatus !== "Approved" && order.status !== "Cancelled") {
      return sum + order.total;
    }
    return sum;
  }, 0);

  const totalPaidAmount = pastOrders.reduce((sum, order) => {
    if (order.paymentStatus === "Approved" && order.status !== "Cancelled") {
      return sum + order.total;
    }
    return sum;
  }, 0);

  const totalBillAmount = totalPaidAmount + totalUnpaidAmount;

  // --- Aggregated Items Logic ---
  const aggregatedItems = useMemo(() => {
    const map = new Map<
      string,
      {
        itemId: string;
        name: string;
        quantity: number;
        price: number;
        totalPrice: number;
        statusWeights: Record<string, number>;
        paidCount: number;
        unpaidAmount: number;
      }
    >();

    pastOrders.forEach((order) => {
      // Filter out invalid statuses
      if (order.status === "Cancelled") return;

      order.items.forEach((item) => {
        let existing = map.get(item.id);
        const isPaid = order.paymentStatus === "Approved";

        if (!existing) {
          existing = {
            itemId: item.id,
            name: item.name,
            quantity: 0,
            price: item.price,
            totalPrice: 0,
            statusWeights: {},
            paidCount: 0,
            unpaidAmount: 0,
          };
          map.set(item.id, existing);
        }

        existing.quantity += item.quantity;
        existing.totalPrice += item.price * item.quantity;

        // Track status
        const status = order.status || "Unknown";
        existing.statusWeights[status] =
          (existing.statusWeights[status] || 0) + item.quantity;

        if (isPaid) {
          existing.paidCount += item.quantity;
        } else {
          existing.unpaidAmount += item.price * item.quantity;
        }
      });
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [pastOrders]);

  const [isProcessing, setIsProcessing] = useState(false);

  // --- Instant Order Handlers ---

  const handleInstantAdd = async (
    item: MenuItem & {
      spiceLevel?: string;
      specialInstructions?: string;
      quantity?: number;
    }
  ) => {
    if (!activeTable) {
      toast({ variant: "destructive", title: "Table not loaded" });
      return;
    }
    setIsProcessing(true);

    try {
      const payload = {
        tableId: activeTable.id,
        items: [
          {
            itemId: parseInt(item.id, 10) || item.id,
            quantity: item.quantity || 1,
            specialInstructions: item.specialInstructions || null,
            spiceLevel: item.spiceLevel || null,
          },
        ],
        customerName: localCustomerName || "",
        customerPhone: localCustomerPhone || "",
        restaurantId: restaurantId ? parseInt(restaurantId, 10) : undefined,
        orderType: pastOrders.length > 0 ? "addon" : "regular",
      };

      const token = localStorage.getItem("accessToken");
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE}/orders`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Failed to place order");
      }

      toast({
        title: "Order Placed",
        description: `Added 1x ${item.name}`,
        duration: 1500,
      });

      if (activeTable) {
        await fetchRelevantOrders(undefined, String(activeTable.id)); // Refresh orders
      } else {
        await fetchRelevantOrders();
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Failed to add item" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDirectQuantityChange = async (
    itemId: string,
    newQuantity: number
  ) => {
    if (isNaN(newQuantity) || newQuantity < 0) return;

    // Find current aggregated item
    const currentItem = aggregatedItems.find((i) => i.itemId === itemId);
    if (!currentItem) return;

    const currentQty = currentItem.quantity;
    const diff = newQuantity - currentQty;

    if (diff === 0) return;

    setIsProcessing(true);
    try {
      if (diff > 0) {
        // Need to ADD items
        // Find menu item details
        const fullItem = menuItems.find((m) => String(m.id) === String(itemId));
        if (!fullItem) {
          console.error("Could not find item details for addition");
          return;
        }

        // Loop to add multiple times? Or bulk add?
        // Existing endpoint takes array of items. We can send one request with quantity = diff.
        // handleInstantAdd takes 1 item. Let's make a specialized handler or loop.
        // PROPER OPTIMIZATION: Send 1 request with quantity = diff

        if (!activeTable) return;

        const payload = {
          tableId: activeTable.id,
          items: [
            {
              itemId: parseInt(fullItem.id, 10) || fullItem.id,
              quantity: diff, // Helper: Add 'diff' amount
              specialInstructions: null,
              spiceLevel: null,
            },
          ],
          customerName: localCustomerName || "Admin",
          customerPhone: localCustomerPhone || "0000000000",
          restaurantId: restaurantId ? parseInt(restaurantId, 10) : undefined,
          orderType: pastOrders.length > 0 ? "addon" : "regular",
        };

        const token = localStorage.getItem("accessToken");
        const headers: Record<string, string> = {
          "Content-Type": "application/json",
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE}/orders`, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        });

        if (!res.ok) throw new Error("Failed to update quantity");
        toast({
          title: "Quantity Updated",
          description: `Added ${diff}x ${fullItem.name}`,
        });
      } else {
        // Need to REMOVE items (diff is negative)
        // cancellations must be done order by order usually.
        // But we need to remove abs(diff) items.
        // Logic: Find recent cancelable orders and cancel them until we satisfy the count.
        // Problem: If an order has 5 items and we want to remove 2, we might not be able to partial cancel effortlessly if backend doesn't support it.
        // Assumption: Backend only supports FULL order cancellation?
        // Previous code assumed we find an order and cancel it.
        // If we have 5 separate orders of 1 item each, we can cancel 2 of them.
        // If we have 1 order of 5 items, can we decrement? 'cancelOrder' takes orderId.
        // If backend doesn't support partial, we can't implement "change 5 to 3" for a single 5-item order without cancelling and re-ordering 3.

        // For now, let's implement iterative removal of "cancelable" instances.
        // We will loop abs(diff) times calling the removal logic? No, that's slow.
        // We will find N orders to cancel.

        let countToRemove = Math.abs(diff);
        let removed = 0;

        // Get all cancelable orders with this item, sorted by recent
        const candidates = pastOrders
          .filter(
            (o) =>
              o.items.some((i) => i.id === itemId) &&
              !["Served", "Completed", "Cancelled"].includes(o.status)
          )
          .sort((a, b) => b.date - a.date);

        // We need to count how many "units" of the item each order has.
        // And cancel orders until we hit the count.
        // Warning: Cancelling an order removes ALL items in it.

        for (const order of candidates) {
          if (removed >= countToRemove) break;

          const itemInOrder = order.items.find((i) => i.id === itemId);
          const qtyInOrder = itemInOrder ? itemInOrder.quantity : 0;

          // Safety: If this order has mismatched items (other items) or more quantity than we want to remove?
          // Complex case: Order has 5 items, we want to remove 1.
          // If we cancel the order, we lose 5. We'd have to re-order 4.
          // This logic is getting complex for "bulk update".

          // SIMPLIFIED APPROACH: Only cancel orders where we can cleaner do so, or warn user.
          // For direct input "decrease", it implies "smart adjustment".

          // Let's rely on 'cancelOrder' which we know works for full order cancellation.
          // We will try to find orders to cancel.

          await cancelOrder(order.id);
          removed += qtyInOrder; // We removed this many

          // If we removed too many (e.g. wanted 2, removed order of 5), we should re-add the difference?
          // This "re-balancing" auto logic is standard in smart POS.
          // If removed (5) > countToRemove (2), we need to add back (3).
          if (removed > countToRemove) {
            const toAddBack = removed - countToRemove;
            // Re-add items
            const fullItem = menuItems.find(
              (m) => String(m.id) === String(itemId)
            );
            if (fullItem) {
              if (activeTable) {
                const payload = {
                  tableId: activeTable.id,
                  items: [
                    {
                      itemId: parseInt(fullItem.id, 10) || fullItem.id,
                      quantity: toAddBack,
                      specialInstructions: null,
                      spiceLevel: null,
                    },
                  ],
                  customerName: "Admin",
                  customerPhone: "0000000000",
                  restaurantId: restaurantId
                    ? parseInt(restaurantId, 10)
                    : undefined,
                  orderType: pastOrders.length > 0 ? "addon" : "regular",
                };
                const token = localStorage.getItem("accessToken");
                const headers: Record<string, string> = {
                  "Content-Type": "application/json",
                };
                if (token) headers["Authorization"] = `Bearer ${token}`;
                await fetch(`${API_BASE}/orders`, {
                  method: "POST",
                  headers,
                  body: JSON.stringify(payload),
                });
              }
            }
          }
        }
        toast({ title: "Quantity Updated", description: `Removed items.` });
      }

      if (activeTable) {
        await fetchRelevantOrders(undefined, String(activeTable.id));
      } else {
        await fetchRelevantOrders();
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Update failed" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInstantRemove = async (itemId: string) => {
    // ... existing logic ...
    // Reuse existing logic or keep it for the "-" button?
    // The "-" button removes ONE item. The input can remove MANY.
    // Let's keep existing logic primarily for the "-" button if it's different/safer?
    // Actually existing logic is "find order and cancel".
    // Let's leave handleInstantRemove as is for safety.

    // ... (rest of function)
    // Find the most recent cancelable order containing this item
    // Prefer "Pending" or "Confirmed" status.
    // If order has multiple items, we can't easily remove just one unless backend supports "remove item".
    // Assuming backend ONLY supports "Cancel Order", we can only cancel single-item orders safely,
    // OR explain to user we are cancelling the whole order?
    // User requested: "remove that".

    // Strategy: Find an order that contains THIS item.
    // Sort orders by date descending.
    const candidates = [...pastOrders].sort((a, b) => b.date - a.date);

    // We strive to find an order that has ONLY this item and is not Served/Completed.
    // Or if it has multiple items, we warn?
    // But for "Instant Order" flow (click = 1 order), most orders will be single items.

    const targetOrder = candidates.find(
      (o) =>
        o.items.some((i) => i.id === itemId) &&
        o.status !== "Served" &&
        o.status !== "Completed" &&
        o.status !== "Cancelled"
    );

    if (!targetOrder) {
      toast({
        variant: "destructive",
        title: "No cancelable order found for this item.",
      });
      return;
    }

    // Check if it's a single item order
    if (targetOrder.items.length > 1) {
      if (
        !confirm(
          `The latest order with ${itemId} contains other items too. Cancelling it will remove ALL items in that order (#${targetOrder.orderNumber}). Continue?`
        )
      ) {
        return;
      }
    }

    setIsProcessing(true);
    try {
      await cancelOrder(targetOrder.id);
      toast({ title: "Item removed", description: "Order cancelled." });
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteAll = async (itemId: string) => {
    // Find ALL cancelable orders containing this item
    const targetOrders = pastOrders.filter(
      (o) =>
        o.items.some((i) => i.id === itemId) &&
        o.status !== "Served" &&
        o.status !== "Completed" &&
        o.status !== "Cancelled"
    );

    if (targetOrders.length === 0) {
      toast({
        variant: "destructive",
        title: "No cancelable orders found for this item.",
      });
      return;
    }

    // Check for mixed orders (containing other items)
    const mixedOrders = targetOrders.filter((o) => o.items.length > 1);
    if (mixedOrders.length > 0) {
      if (
        !confirm(
          `You are about to cancel ${targetOrders.length} orders.\n\nWARNING: ${mixedOrders.length} of these orders contain OTHER items which will also be cancelled.\n\nProceed?`
        )
      ) {
        return;
      }
    } else {
      if (
        !confirm(
          `Are you sure you want to cancel all ${targetOrders.length} active orders for this item?`
        )
      ) {
        return;
      }
    }

    setIsProcessing(true);
    try {
      let cancelledCount = 0;
      for (const order of targetOrders) {
        await cancelOrder(order.id);
        cancelledCount++;
      }
      toast({
        title: "Orders Cancelled",
        description: `Successfully cancelled ${cancelledCount} orders.`,
      });
      if (activeTable) {
        await fetchRelevantOrders(undefined, String(activeTable.id));
      } else {
        await fetchRelevantOrders();
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Failed to cancel some orders" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadBill = () => {
    try {
      if (!activeTable || pastOrders.length === 0) {
        toast({
          variant: "destructive",
          title: "No orders",
          description: "Cannot generate bill for a table with no orders.",
        });
        return;
      }

      // Create a virtual "session order" to aggregate all orders for the bill
      const subtotal = aggregatedItems.reduce(
        (acc, i) => acc + i.totalPrice,
        0
      );
      const tax = subtotal * (taxRate / 100);
      const discount = subtotal * (discountRate / 100);
      const total = subtotal + tax - discount;

      const sessionOrder = {
        id: `session-${activeTable.id}`,
        orderNumber: `BN-${activeTable.id}-${Date.now().toString().slice(-4)}`,
        userName: localCustomerName || "",
        userPhone: localCustomerPhone || "",
        tableNumber: activeTable.tableNumber,
        tableId: String(activeTable.id),
        date: Date.now(),
        status: "Completed" as any,
        paymentStatus: totalUnpaidAmount <= 0 ? "Approved" : "Pending",
        paymentMethod: pastOrders[0]?.paymentMethod || "Cash",
        total: total,
        subtotal: subtotal,
        tax: tax,
        discount: discount,
        orderType: "regular",
        items: aggregatedItems.map((i) => ({
          id: i.itemId,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          category: "",
        })),
      };

      const profile = {
        name: restaurantName,
        address: restaurantAddress,
        contactNumber: contactNumber,
        gstin: gstin,
        fssaiLicNo: fssaiLicNo,
        tagline: restaurantTagline,
        cashierName: adminUser?.username || adminUser?.fullName || "Admin",
      };

      generateBillPDF(sessionOrder as any, profile);

      toast({
        title: "Bill Generated",
        description: "PDF bill has been downloaded.",
      });
    } catch (e) {
      console.error("Download failed", e);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not generate bill PDF",
      });
    }
  };

  const handleClearSession = async () => {
    if (
      confirm(
        "Are you sure you want to clear this table? This will archive current orders and free the table."
      )
    ) {
      const targetId = activeTable ? activeTable.id : Number(tableId);

      await clearTableSession(targetId);
      router.push(`/${slug}/dashboard`);
    }
  };

  const handleMarkPaid = async (method: string) => {
    const unpaidOrders = pastOrders.filter(
      (o) => o.paymentStatus !== "Approved" && o.status !== "Cancelled"
    );

    if (unpaidOrders.length === 0) {
      toast({ title: "No unpaid orders to settle." });
      return;
    }

    let successCount = 0;
    for (const order of unpaidOrders) {
      try {
        await updatePaymentMethod(order.id, method, "Approved");
        successCount++;
      } catch (e) {
        console.error(e);
      }
    }

    if (successCount > 0) {
      toast({ title: `Settled ${successCount} orders via ${method}` });
    }
  };

  return (
    <div className="flex flex-col h-screen max-h-screen bg-[#f8fafc] dark:bg-slate-950 overflow-hidden text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* PREMIUM UNIFIED HEADER */}
      <header className="h-16 flex-shrink-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 flex items-center justify-between px-4 sm:px-6 z-20 shadow-sm transition-all">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/${slug}/dashboard`)}
            className="hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition-all rounded-full h-10 w-10 p-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight flex items-center gap-2">
              <span className="text-slate-900 dark:text-white">
                Table {activeTable ? activeTable.tableNumber : tableId}
              </span>
              <span className="text-slate-200 dark:text-slate-700 font-extralight mx-1 hidden xs:inline">
                |
              </span>
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400 hidden sm:inline">
                Details
              </span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTable && (
            <div
              className={cn(
                "px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider border shadow-sm transition-all",
                activeTable.status === "Empty"
                  ? "bg-status-empty-bg text-status-empty-text border-status-empty-text/20 dark:border-status-empty-text/10"
                  : activeTable.status === "Occupied"
                  ? "bg-status-occupied-bg text-status-occupied-text border-status-occupied-text/20 dark:border-status-occupied-text/10"
                  : activeTable.status === "Paid & Occupied"
                  ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800"
                  : "bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700"
              )}
            >
              {activeTable.status === "Empty"
                ? "Available"
                : activeTable.status}
            </div>
          )}
          <div className="h-6 w-px bg-slate-200 mx-1 hidden xs:block" />
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-slate-400 hover:text-primary transition-colors hover:bg-slate-100 rounded-full"
            onClick={handleDownloadBill}
            title="Download PDF Bill"
          >
            <Printer className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* MINIMALISTIC CUSTOMER INFO PANEL */}
      <div className="flex-shrink-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-sm border-b border-dashed dark:border-slate-800/50 px-4 sm:px-6 py-2 transition-all">
        <div className="flex flex-wrap items-center gap-4 sm:gap-8 max-w-[1920px] mx-auto">
          <div className="flex items-center gap-2 group min-w-[200px]">
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400 group-focus-within:text-primary transition-colors">
              Customer:
            </span>
            <input
              type="text"
              placeholder="Guest Name"
              value={localCustomerName}
              onChange={(e) => setLocalCustomerName(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-md px-2 py-1 text-sm font-medium placeholder:text-slate-300 dark:placeholder:text-slate-600 w-full h-8 transition-all outline-none"
            />
          </div>

          <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-700 mx-2" />

          {/* Customer Phone */}
          <div className="flex items-center gap-2 flex-1 min-w-[120px]">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 dark:text-slate-400 uppercase">
              PHONE:
            </span>
            <input
              type="text"
              placeholder="Guest Phone Number"
              value={localCustomerPhone}
              onChange={(e) => setLocalCustomerPhone(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 focus:border-primary/50 focus:ring-1 focus:ring-primary/20 rounded-md px-2 py-1 text-sm font-medium placeholder:text-slate-300 dark:placeholder:text-slate-600 w-full h-8 transition-all outline-none"
            />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-[1fr_380px] xl:grid-cols-[1fr_420px] 2xl:max-w-[1920px] 2xl:mx-auto 2xl:w-full transition-all">
        {/* LEFT: MENU CONTENT */}
        <section className="flex flex-col h-full overflow-hidden border-r dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors">
          <div className="flex-1 overflow-hidden">
            <MenuContent
              disableTokenVerification={true}
              enableCartWidget={false}
              layoutMode="split"
              customTableId={
                activeTable ? Number(activeTable.tableNumber) : Number(tableId)
              }
              onAddToCart={handleInstantAdd}
            />
          </div>
        </section>

        {/* RIGHT: ACTIVE ORDERS SIDEBAR */}
        <section className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/40 backdrop-blur-sm lg:h-full lg:overflow-hidden relative transition-colors">
          <Card className="flex flex-col h-full border-none shadow-none bg-transparent rounded-none">
            <CardHeader className="py-5 px-6 border-b dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 transition-colors">
              <CardTitle className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center justify-between">
                <span>Current Orders</span>
                <Badge
                  variant="outline"
                  className="font-semibold text-[10px] bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 uppercase tracking-tight"
                >
                  {aggregatedItems.length} items
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0 bg-white/40 dark:bg-slate-900/30 transition-colors">
              {isTablesLoading || (!activeTable && !pastOrders.length) ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-300" />
                </div>
              ) : aggregatedItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50 space-y-3 p-8">
                  <div className="p-5 rounded-full bg-slate-100/50 shadow-inner">
                    <Banknote className="w-10 h-10 opacity-20" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-400">
                      No active orders
                    </p>
                    <p className="text-[11px] uppercase tracking-widest mt-1 opacity-70">
                      Table is empty
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 space-y-3">
                  {aggregatedItems.map((item) => (
                    <div
                      key={item.itemId}
                      className="group relative flex items-center justify-between p-3.5 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all duration-300 hover:border-primary/30 dark:hover:border-primary/40 hover:shadow-lg hover:shadow-slate-200/40 dark:hover:shadow-black/20 hover:-translate-y-0.5 overflow-hidden"
                    >
                      <div className="flex flex-col gap-1 min-w-0 pr-4 flex-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="font-bold text-sm truncate text-slate-800 dark:text-slate-100 tracking-tight"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                            ₹{item.totalPrice}
                          </span>

                          {/* Payment Status */}
                          {item.paidCount > 0 ? (
                            item.unpaidAmount > 0 ? (
                              <Badge
                                key="due"
                                variant="outline"
                                className="h-4 text-[9px] px-1.5 font-black uppercase text-red-500 bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900 tracking-tighter"
                              >
                                Due ₹{item.unpaidAmount}
                              </Badge>
                            ) : (
                              <Badge
                                key="paid"
                                variant="outline"
                                className="h-4 text-[9px] px-1.5 font-black uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900 tracking-tighter"
                              >
                                Paid
                              </Badge>
                            )
                          ) : null}
                        </div>
                      </div>

                      {/* RIGHT: Controls */}
                      <div className="flex items-center gap-2.5 flex-shrink-0">
                        <div className="flex items-center bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-xl h-9 px-1 shadow-inner overflow-hidden transition-colors">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"
                            onClick={() => handleInstantRemove(item.itemId)}
                            disabled={isProcessing}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <Input
                            key={item.quantity}
                            className="h-7 w-9 p-0 text-center font-bold text-xs border-none bg-transparent focus-visible:ring-0 text-slate-700 dark:text-slate-200"
                            type="number"
                            min="0"
                            defaultValue={item.quantity}
                            onBlur={(e) => {
                              const val = parseInt(e.target.value, 10);
                              if (!isNaN(val) && val !== item.quantity) {
                                handleDirectQuantityChange(item.itemId, val);
                              } else {
                                e.target.value = String(item.quantity);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                            }}
                            disabled={isProcessing}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"
                            onClick={() => {
                              const fullItem = menuItems.find(
                                (m) => String(m.id) === String(item.itemId)
                              );
                              if (fullItem) handleInstantAdd(fullItem);
                            }}
                            disabled={isProcessing}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-red-500/70 dark:text-red-500/50 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all rounded-xl"
                          onClick={() => handleDeleteAll(item.itemId)}
                          disabled={isProcessing}
                          title="Remove All"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>

            {/* SUMMARY FOOTER */}
            <div className="flex-shrink-0 bg-white dark:bg-slate-950 border-t border-slate-200/60 dark:border-slate-800 p-5 shadow-[0_-4px_12px_rgba(0,0,0,0.02)] dark:shadow-none transition-colors">
              {/* Financial Breakdown */}
              <div className="space-y-2 mb-5">
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <span>Paid Amount</span>
                  <span className="text-emerald-600 dark:text-emerald-500 tabular-nums">
                    ₹{totalPaidAmount}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                  <span>Due Amount</span>
                  <span className="text-red-500 dark:text-red-400 tabular-nums">
                    ₹{totalUnpaidAmount}
                  </span>
                </div>
                <div className="h-px bg-gradient-to-r from-transparent via-slate-200 dark:via-slate-800 to-transparent my-2" />
                <div className="flex justify-between items-center">
                  <span className="text-sm font-extrabold text-slate-800 dark:text-slate-200 uppercase tracking-tight">
                    Total Bill
                  </span>
                  <span className="text-xl font-black text-primary dark:text-primary tabular-nums">
                    ₹{totalBillAmount}
                  </span>
                </div>
              </div>

              {/* ACTION BUTTONS */}
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl font-bold text-xs uppercase tracking-widest border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:border-emerald-200 dark:hover:border-emerald-800 hover:text-emerald-800 dark:hover:text-emerald-300 shadow-sm transition-all"
                    onClick={() => handleMarkPaid("Cash")}
                  >
                    <Banknote className="w-4 h-4 mr-2 opacity-80" /> Cash
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11 rounded-xl font-bold text-xs uppercase tracking-widest border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-800 hover:text-blue-800 dark:hover:text-blue-300 shadow-sm transition-all"
                    onClick={() => handleMarkPaid("UPI")}
                  >
                    <CreditCard className="w-4 h-4 mr-2 opacity-80" /> UPI
                  </Button>
                </div>
                <Button
                  variant="default"
                  className="w-full h-11 rounded-xl font-bold text-xs uppercase tracking-widest bg-slate-900 dark:bg-primary hover:bg-slate-800 dark:hover:bg-primary/90 text-white shadow-md shadow-slate-200 dark:shadow-none transition-all active:scale-[0.98]"
                  onClick={handleClearSession}
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> Settle & Clear Table
                </Button>
              </div>
            </div>
          </Card>
        </section>
      </main>
    </div>
  );
}
