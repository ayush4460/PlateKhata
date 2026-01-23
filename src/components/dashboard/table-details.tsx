"use client";

import { useEffect, useState, useMemo, useRef } from "react";
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
import { useRouter, usePathname } from "next/navigation";
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
  backUrl?: string;
}

const API_BASE = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
).replace(/\/$/, "");

export function TableDetails({ tableId, slug, backUrl }: TableDetailsProps) {
  const router = useRouter();
  const pathname = usePathname();
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingKey, setProcessingKey] = useState<string | null>(null);
  const [optimisticUpdates, setOptimisticUpdates] = useState<
    Record<string, number>
  >({});

  const updateTimeouts = useRef<Record<string, NodeJS.Timeout>>({});
  const sessionActiveRef = useRef(false);

  useEffect(() => {
    if (isTablesLoading || !tableStatuses || tableStatuses.length === 0) return;

    const targetTableNumber = tableId;
    const foundTable = tableStatuses.find(
      (t) => t.tableNumber === targetTableNumber,
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
        `[TableDetails] Table Number ${targetTableNumber} not found in statuses.`,
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
        ),
    );
  }, [combinedOrders, activeTable, tableId]);

  // Sync Session Active Ref
  useEffect(() => {
    if (
      pastOrders.length > 0 ||
      (activeTable && activeTable.status === "Occupied")
    ) {
      sessionActiveRef.current = true;
    } else {
      // Only reset if we are sure?
      // If we just navigated here, it might be false.
      // But if we have optimistic updates pending, keep it true?
      // Actually, safer to only set to TRUE when confirmed.
      // But we rely on it being true during rapid add.
      // If pastOrders becomes 0 (e.g. cancelled all), we should reset?
      // Let's trust the Ref's optimistic set, but allow sync to override if backend confirms empty.
      if (
        pastOrders.length === 0 &&
        activeTable &&
        activeTable.status !== "Occupied"
      ) {
        sessionActiveRef.current = false;
      }
    }
  }, [pastOrders.length, activeTable]);

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
        customizations?: any[];
        spiceLevel?: string;
        specialInstructions?: string | null;
        uniqueKey: string; // Ensure interface matches
      }
    >();

    pastOrders.forEach((order) => {
      // Filter out invalid statuses
      if (order.status === "Cancelled") return;

      order.items.forEach((item) => {
        // Generate a unique key based on ID + Customizations + Spice Level
        // Sort customizations to ensure consistency
        const custLabels = item.customizations
          ? item.customizations
              .map((c) => c.name)
              .sort()
              .join(", ")
          : "";
        const uniqueKey = `${item.id}-${item.spiceLevel || ""}-${custLabels}`;

        let existing = map.get(uniqueKey);
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
            customizations: item.customizations || [], // Store for display
            spiceLevel: item.spiceLevel || undefined,
            specialInstructions: (item as any).specialInstructions || null,
            uniqueKey: uniqueKey,
          };
          map.set(uniqueKey, existing);
        }

        existing!.quantity += item.quantity;
        // Total price calculation should rely on the price stored in the item (which includes customizations)
        existing!.totalPrice += item.price * item.quantity;

        // Track status
        const status = order.status || "Unknown";
        existing!.statusWeights[status] =
          (existing!.statusWeights[status] || 0) + item.quantity;

        if (isPaid) {
          existing!.paidCount += item.quantity;
        } else {
          existing!.unpaidAmount += item.price * item.quantity;
        }
      });
    });

    // Apply Optimistic Updates
    map.forEach((existing, key) => {
      if (optimisticUpdates[key] !== undefined) {
        // Override with optimistic quantity
        const optQty = optimisticUpdates[key];
        existing.quantity = optQty;
        existing.totalPrice = existing.price * optQty;

        // Recalculate unpaid
        // Assuming paid items are usually the "first" items, or we just subtract paidCount
        const safePaid = Math.min(existing.paidCount, optQty);
        existing.paidCount = safePaid;
        existing.unpaidAmount = existing.totalPrice - existing.price * safePaid;
      }
    });

    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [pastOrders, optimisticUpdates]);

  // --- Sync Customer Details from Backend (Table Status) ---
  useEffect(() => {
    if (activeTable) {
      // If backend provides details, load them BUT only if table is occupied
      // If table is Empty/Available, we want to show blank inputs for new customer
      const isAvailable = activeTable.status === "Empty";
      const backendName = isAvailable ? "" : activeTable.customerName || "";
      const backendPhone = isAvailable ? "" : activeTable.customerPhone || "";

      // Reactive Clear: If table became available and local state still holds the old backend data, clear it.
      if (isAvailable && isDataLoaded) {
        // We check against the RAW backend data (activeTable.customerName), not backendName (which is "")
        if (
          activeTable.customerName &&
          localCustomerName === activeTable.customerName
        ) {
          setLocalCustomerName("");
        }
        if (
          activeTable.customerPhone &&
          localCustomerPhone === activeTable.customerPhone
        ) {
          setLocalCustomerPhone("");
        }
      }

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
        // PREVENT AUTO-WIPE of DB if table is Available and we just defaulted to empty
        // User requested: "keep in database but wipe frontend"
        if (
          activeTable.status === "Empty" &&
          localCustomerName === "" &&
          localCustomerPhone === "" &&
          (activeTable.customerName || activeTable.customerPhone)
        ) {
          // Do not sync the "blanking" to backend
          return;
        }

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
          (o) => o.userName || o.userPhone,
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

  const totalUnpaidAmount = useMemo(
    () => aggregatedItems.reduce((sum, item) => sum + item.unpaidAmount, 0),
    [aggregatedItems],
  );
  const totalPaidAmount = useMemo(
    () =>
      aggregatedItems.reduce(
        (sum, item) => sum + item.price * item.paidCount,
        0,
      ),
    [aggregatedItems],
  );
  const totalBillAmount = totalPaidAmount + totalUnpaidAmount;

  // --- Instant Order Handlers ---
  // ... (keeping existing handlers - assuming they handle 'itemId' correctly.
  // NOTE: 'itemId' in handleInstantRemove refers to menu item ID.
  // If we have split rows for same item ID, removing by ID might be ambiguous if we don't pass unique characteristics.
  // But for now, user asked for display fix. Handling granular removal of specific variants requires deeper API changes.
  // The existing 'handleInstantRemove' logic finds "recent order with this item ID".
  // It might remove the WRONG variant if multiple exist.
  // However, I will focus on the DISPLAY first as requested.)

  const handleInstantAdd = async (
    item: MenuItem & {
      spiceLevel?: string;
      specialInstructions?: string;
      quantity?: number;
      customizations?: any[];
      uniqueKey?: string; // Passed for optimistic updates
    },
  ) => {
    if (!activeTable) {
      toast({ variant: "destructive", title: "Table not loaded" });
      return;
    }
    setIsProcessing(true);
    // Optimistic Update: If uniqueKey is provided (from existing aggregated item)
    if (item.uniqueKey) {
      setProcessingKey(item.uniqueKey);
      setOptimisticUpdates((prev) => ({
        ...prev,
        [item.uniqueKey!]:
          (prev[item.uniqueKey!] || (item as any).currentQty || 0) + 1,
      }));
    }

    try {
      const payload = {
        tableId: activeTable.id,
        items: [
          {
            itemId: parseInt(item.id, 10) || item.id,
            quantity: item.quantity || 1,
            specialInstructions: item.specialInstructions || null,
            spiceLevel: item.spiceLevel || null,
            customizations: item.customizations || undefined,
          },
        ],
        customerName: localCustomerName || "",
        customerPhone: localCustomerPhone || "",
        restaurantId: restaurantId ? parseInt(restaurantId, 10) : undefined,
        orderType: sessionActiveRef.current ? "addon" : "regular",
      };

      // Optimistically mark session as active so next rapid click uses "addon"
      sessionActiveRef.current = true;

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
        await fetchRelevantOrders(undefined, String(activeTable.id));
      } else {
        await fetchRelevantOrders();
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Failed to add item" });
      // Revert optimistic
      if (item.uniqueKey) {
        setOptimisticUpdates((prev) => {
          const n = { ...prev };
          delete n[item.uniqueKey!];
          return n;
        });
      }
    } finally {
      setIsProcessing(false);
      setProcessingKey(null);
      // Clear optimistic update after sync
      if (item.uniqueKey) {
        setOptimisticUpdates((prev) => {
          const n = { ...prev };
          delete n[item.uniqueKey!];
          return n;
        });
      }
    }
  };

  const handleDirectQuantityChange = async (itemObj: any, newQty: number) => {
    // Helper to generate key (must match aggregatedItems logic)
    const getUKey = (i: any) => {
      const custLabels = i.customizations
        ? i.customizations
            .map((c: any) => c.name)
            .sort()
            .join(", ")
        : "";
      return `${i.id}-${i.spiceLevel || ""}-${custLabels}`;
    };

    // Calculate REAL quantity from pastOrders (Source of Truth)
    const currentQty = pastOrders
      .filter((o) => o.status !== "Cancelled")
      .reduce((sum, o) => {
        const match = o.items.find(
          (i: any) => getUKey(i) === itemObj.uniqueKey,
        );
        return sum + (match ? match.quantity : 0);
      }, 0);

    const diff = newQty - currentQty;

    // console.log(`[Debounce Exec] Real: ${currentQty}, Target: ${newQty}, Diff: ${diff}`);

    if (diff === 0) {
      // Just clear optimistic if any
      setOptimisticUpdates((prev) => {
        const n = { ...prev };
        delete n[itemObj.uniqueKey];
        return n;
      });
      return;
    }

    setIsProcessing(true);
    setProcessingKey(itemObj.uniqueKey);
    // Note: Optimistic State is likely ALREADY set by the debouncer.
    // We don't need to set it here again, but keeping it in sync is fine.

    try {
      if (diff > 0) {
        // Simple Add
        const fullItem = menuItems.find(
          (m) => String(m.id) === String(itemObj.itemId),
        );
        if (fullItem && activeTable) {
          const payload = {
            tableId: activeTable.id,
            items: [
              {
                itemId: parseInt(fullItem.id, 10) || fullItem.id,
                quantity: diff,
                specialInstructions: itemObj.specialInstructions,
                spiceLevel: itemObj.spiceLevel,
                customizations: itemObj.customizations,
              },
            ],
            customerName: localCustomerName || "",
            customerPhone: localCustomerPhone || "",
            restaurantId: restaurantId ? parseInt(restaurantId, 10) : undefined,
            orderType: sessionActiveRef.current ? "addon" : "regular",
          };

          // Optimistically mark session as active
          sessionActiveRef.current = true;
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
          toast({ title: "Quantity Updated", description: "Added items." });
        }
      } else {
        // Decrease
        const countToRemove = Math.abs(diff);
        let removedSoFar = 0;

        // Find match candidates exactly like handleInstantRemove
        const candidates = pastOrders
          .filter(
            (o) =>
              o.items.some((i: any) => {
                if (i.id !== itemObj.itemId) return false;
                // Compare Spice
                if ((itemObj.spiceLevel || null) !== (i.spiceLevel || null))
                  return false;
                // Compare Customizations
                const uCusts = itemObj.customizations || [];
                const oCusts = i.customizations || [];
                if (uCusts.length !== oCusts.length) return false;
                return uCusts.every((c1: any) =>
                  oCusts.some(
                    (c2: any) =>
                      (c1.id && c2.option_id && c1.id === c2.option_id) ||
                      (c1.id && c2.id && c1.id === c2.id) ||
                      c1.name === c2.name,
                  ),
                );
              }) && !["Served", "Completed", "Cancelled"].includes(o.status),
          )
          .sort((a, b) => b.date - a.date);

        for (const order of candidates) {
          if (removedSoFar >= countToRemove) break;

          // Re-find the exact item index or object in this order (to get its Qty)
          const targetItemInOrder = order.items.find((i: any) => {
            if (i.id !== itemObj.itemId) return false;
            // Compare Spice
            if ((itemObj.spiceLevel || null) !== (i.spiceLevel || null))
              return false;
            // Compare Customizations
            const uCusts = itemObj.customizations || [];
            const oCusts = i.customizations || [];
            if (uCusts.length !== oCusts.length) return false;
            return uCusts.every((c1: any) =>
              oCusts.some(
                (c2: any) =>
                  (c1.id && c2.option_id && c1.id === c2.option_id) ||
                  (c1.id && c2.id && c1.id === c2.id) ||
                  c1.name === c2.name,
              ),
            );
          });

          if (!targetItemInOrder) continue;

          const qtyInOrder = targetItemInOrder.quantity;

          // Cancel this order
          await cancelOrder(order.id);
          removedSoFar += qtyInOrder;

          // Re-balance logic
          const itemsToKeep: any[] = [];

          // 1. Add back OTHER items in this order
          order.items.forEach((oi: any) => {
            // We need to exclude the SPECIFIC instance we targeted.
            // Since 'targetItemInOrder' is a reference from 'order.items', we can compare reference?
            // Yes, usually.
            if (oi !== targetItemInOrder) {
              itemsToKeep.push({
                itemId: parseInt(oi.id, 10) || oi.id,
                quantity: oi.quantity,
                specialInstructions: oi.specialInstructions,
                spiceLevel: oi.spiceLevel,
                customizations: oi.customizations,
              });
            }
          });

          // 2. Add back the remainder of THIS item if we removed too much
          // Logic:
          // removing(2). found(5). removedSoFar(5). Excess removed = 3.
          // But 'removedSoFar' is cumulative.
          // We need to know how much of THIS specific order's quantity was "consumed" by the removal.

          // 'needed' = countToRemove - (removedSoFar - qtyInOrder)
          // 'consumed' = min(needed, qtyInOrder)
          // 'remainder' = qtyInOrder - consumed.

          const previousRemoved = removedSoFar - qtyInOrder;
          const needed = countToRemove - previousRemoved;
          const consumed = Math.min(needed, qtyInOrder);
          const remainder = qtyInOrder - consumed;

          if (remainder > 0) {
            itemsToKeep.push({
              itemId:
                parseInt(targetItemInOrder.id, 10) || targetItemInOrder.id,
              quantity: remainder,
              specialInstructions: (targetItemInOrder as any)
                .specialInstructions,
              spiceLevel: targetItemInOrder.spiceLevel,
              customizations: targetItemInOrder.customizations,
            });
          }

          // Execute Re-Creation if we have items to keep
          if (itemsToKeep.length > 0 && activeTable) {
            const payload = {
              tableId: activeTable.id,
              items: itemsToKeep,
              customerName: localCustomerName || "",
              customerPhone: localCustomerPhone || "",
              restaurantId: restaurantId
                ? parseInt(restaurantId, 10)
                : undefined,
              orderType: "addon", // maintain valid type
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
      setProcessingKey(null);
      // Clear Optimistic
      setOptimisticUpdates((prev) => {
        const n = { ...prev };
        delete n[itemObj.uniqueKey];
        return n;
      });
    }
  };

  const handleDebouncedUpdate = (item: any, targetQty: number) => {
    const key = item.uniqueKey;
    if (!key) return;

    // 1. Instant Optimistic Update
    setOptimisticUpdates((prev) => ({ ...prev, [key]: targetQty }));

    // 2. Debounce Execution
    if (updateTimeouts.current[key]) {
      clearTimeout(updateTimeouts.current[key]);
    }

    updateTimeouts.current[key] = setTimeout(() => {
      handleDirectQuantityChange(item, targetQty);
      delete updateTimeouts.current[key];
    }, 600); // 600ms debounce
  };

  const handleInstantRemove = async (item: any) => {
    const itemId = item.itemId || item;
    setIsProcessing(true);
    if (item.uniqueKey) {
      setProcessingKey(item.uniqueKey);
      // Optimistic Decrement
      const currentQty = item.quantity || 1;
      setOptimisticUpdates((prev) => ({
        ...prev,
        [item.uniqueKey]: Math.max(0, currentQty - 1),
      }));
    }

    const candidates = [...pastOrders].sort((a, b) => b.date - a.date);
    const targetOrder = candidates.find(
      (o) =>
        o.items.some((i: any) => {
          if (i.id !== itemId) return false;

          // Compare Spice Level
          const itemSpice = item.spiceLevel || null;
          const orderSpice = i.spiceLevel || null;
          if (itemSpice !== orderSpice) return false;

          // Compare Customizations
          // Normalize to strings for comparison or check arrays
          // Frontend 'item' has customizations array. Backend 'i' has customizations array.
          // They might be different structures or orders.
          // Let's rely on a simplified comparison: check if all option IDs match.

          const itemCusts = item.customizations || [];
          const orderCusts = i.customizations || [];

          if (itemCusts.length !== orderCusts.length) return false;

          // Check if every customization in 'item' exists in 'order'
          const allMatch = itemCusts.every((c1: any) =>
            orderCusts.some(
              (c2: any) =>
                // Check by ID if available, else name
                (c1.id && c2.option_id && c1.id === c2.option_id) ||
                (c1.id && c2.id && c1.id === c2.id) ||
                c1.name === c2.name,
            ),
          );

          return allMatch;
        }) && !["Served", "Completed", "Cancelled"].includes(o.status),
    );

    if (!targetOrder) {
      toast({
        variant: "destructive",
        title: "No cancelable order found for this item.",
      });
      return;
    }

    // Logic:
    // 1. Identify valid items to keep.
    // 2. Cancel original order.
    // 3. Re-create order with KEEP items in a single batch.

    const itemsToKeep: any[] = [];

    // Iterate through all items in the order to build the replacement payload
    targetOrder.items.forEach((ordItem: any) => {
      // Is this the item we are targeting?
      if (ordItem.id === itemId) {
        // If this is the target item
        if (ordItem.quantity > 1) {
          // Keep it, but decrement
          itemsToKeep.push({
            itemId: parseInt(ordItem.id, 10) || ordItem.id,
            quantity: ordItem.quantity - 1,
            specialInstructions: ordItem.specialInstructions || null,
            spiceLevel: ordItem.spiceLevel || null,
            customizations: ordItem.customizations || undefined,
          });
        }
        // If quantity is 1, we drop it (don't push to itemsToKeep)
      } else {
        // Keep other items exactly as is
        itemsToKeep.push({
          itemId: parseInt(ordItem.id, 10) || ordItem.id,
          quantity: ordItem.quantity,
          specialInstructions: ordItem.specialInstructions || null,
          spiceLevel: ordItem.spiceLevel || null,
          customizations: ordItem.customizations || undefined,
        });
      }
    });

    const hasOtherItems = targetOrder.items.length > 1; // Re-evaluate after potential decrement

    if (
      hasOtherItems &&
      !confirm(
        `This action will technically cancel Order #${targetOrder.orderNumber} and re-create it with the remaining items to simulate deletion.\n\nProceed?`,
      )
    ) {
      return;
    }

    setIsProcessing(true);
    if (item.uniqueKey) setProcessingKey(item.uniqueKey);
    try {
      // Step A: Cancel the original order
      await cancelOrder(targetOrder.id);

      // Step B: Create new order if there are items to keep
      if (itemsToKeep.length > 0 && activeTable) {
        const payload = {
          tableId: activeTable.id,
          items: itemsToKeep,
          customerName: localCustomerName || "",
          customerPhone: localCustomerPhone || "",
          restaurantId: restaurantId ? parseInt(restaurantId, 10) : undefined,
          orderType: "addon", // Re-ordering is effectively an addon or we keep original type? "addon" is safer for existing session.
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

        toast({
          title: "Updated Order",
          description: `Removed item/decremented quantity.`,
        });
      } else {
        toast({
          title: "Item removed",
          description: "Order cancelled (empty).",
        });
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Failed to update order" });
    } finally {
      if (activeTable) {
        await fetchRelevantOrders(undefined, String(activeTable.id));
      } else {
        await fetchRelevantOrders();
      }
      setProcessingKey(null);
      if (item.uniqueKey) {
        setOptimisticUpdates((prev) => {
          const n = { ...prev };
          delete n[item.uniqueKey];
          return n;
        });
      }
    }
  };

  const handleDeleteAll = async (itemObj: any) => {
    // itemObj is the aggregated row.
    const itemId = itemObj.itemId;

    // Find all 'active' orders that contain this SPECIFIC variant
    const targetOrders = pastOrders.filter(
      (o) =>
        o.items.some((i: any) => {
          if (i.id !== itemId) return false;
          // Compare Spice
          if ((itemObj.spiceLevel || null) !== (i.spiceLevel || null))
            return false;
          // Compare Customizations
          const uCusts = itemObj.customizations || [];
          const oCusts = i.customizations || [];
          if (uCusts.length !== oCusts.length) return false;
          return uCusts.every((c1: any) =>
            oCusts.some(
              (c2: any) =>
                (c1.id && c2.option_id && c1.id === c2.option_id) ||
                (c1.id && c2.id && c1.id === c2.id) ||
                c1.name === c2.name,
            ),
          );
        }) && !["Served", "Completed", "Cancelled"].includes(o.status),
    );

    if (targetOrders.length === 0) {
      toast({
        variant: "destructive",
        title: "No active orders found for this item.",
      });
      return;
    }

    if (
      !confirm(
        `Are you sure you want to remove all ${itemObj.quantity} units of this item?`,
      )
    ) {
      return;
    }

    setIsProcessing(true);
    if (itemObj.uniqueKey) setProcessingKey(itemObj.uniqueKey);
    try {
      let cancelledCount = 0;

      for (const order of targetOrders) {
        // Check if this order has OTHER items that we need to preserve
        // OR if it has multiple lines of this item (unlikely with current backend, but possible)

        let itemsToKeep: any[] = [];

        // Iterate over items in this order
        order.items.forEach((oi: any) => {
          // Check if THIS item 'oi' matches the variant we are deleting.
          let isMatch = false;
          if (oi.id === itemId) {
            // Check details
            const spiceMatch =
              (itemObj.spiceLevel || null) === (oi.spiceLevel || null);
            const uCusts = itemObj.customizations || [];
            const oCusts = oi.customizations || [];
            let custMatch = false;
            if (uCusts.length === oCusts.length) {
              custMatch = uCusts.every((c1: any) =>
                oCusts.some(
                  (c2: any) =>
                    (c1.id && c2.option_id && c1.id === c2.option_id) ||
                    (c1.id && c2.id && c1.id === c2.id) ||
                    c1.name === c2.name,
                ),
              );
            }
            if (spiceMatch && custMatch) {
              isMatch = true;
            }
          }

          if (!isMatch) {
            // Keep it!
            itemsToKeep.push({
              itemId: parseInt(oi.id, 10) || oi.id,
              quantity: oi.quantity,
              specialInstructions: oi.specialInstructions,
              spiceLevel: oi.spiceLevel,
              customizations: oi.customizations,
            });
          }
        });

        // Cancel the original order
        await cancelOrder(order.id);
        cancelledCount++;

        // If we have items to keep, Re-Order them immediately
        if (itemsToKeep.length > 0 && activeTable) {
          const payload = {
            tableId: activeTable.id,
            items: itemsToKeep,
            customerName: localCustomerName || "",
            customerPhone: localCustomerPhone || "",
            restaurantId: restaurantId ? parseInt(restaurantId, 10) : undefined,
            orderType: "addon",
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

      toast({
        title: "Items Removed",
        description: `Removed item from ${cancelledCount} orders.`,
      });

      if (activeTable) {
        await fetchRelevantOrders(undefined, String(activeTable.id));
      } else {
        await fetchRelevantOrders();
      }
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Failed to remove items" });
      setIsProcessing(false);
      setProcessingKey(null);
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
        0,
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
        "Are you sure you want to clear this table? This will archive current orders and free the table.",
      )
    ) {
      const targetId = activeTable ? activeTable.id : Number(tableId);

      await clearTableSession(targetId);

      // REDIRECT FIX: Check path to determine where to go back
      if (pathname?.includes("/supervisor/")) {
        router.push(`/${slug}/supervisor/dashboard`);
      } else {
        router.push(`/${slug}/dashboard`);
      }
    }
  };

  const handleMarkPaid = async (method: string) => {
    const unpaidOrders = pastOrders.filter(
      (o) => o.paymentStatus !== "Approved" && o.status !== "Cancelled",
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
            onClick={() => router.push(backUrl || `/${slug}/dashboard`)}
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
                      : "bg-gray-50 dark:bg-slate-800 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700",
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
              {isTablesLoading && !activeTable && !pastOrders.length ? (
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
                      key={`${item.itemId}-${item.spiceLevel}-${(
                        item.customizations || []
                      )
                        .map((c: any) => c.name)
                        .join("-")}`}
                      className={cn(
                        "group relative flex items-center justify-between p-3.5 bg-white dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all duration-300 hover:border-primary/30 dark:hover:border-primary/40 hover:shadow-lg hover:shadow-slate-200/40 dark:hover:shadow-black/20 hover:-translate-y-0.5 overflow-hidden",
                        processingKey === item.uniqueKey &&
                          "border-primary/30 bg-primary/5",
                      )}
                    >
                      <div className="flex flex-col gap-1 min-w-0 pr-4 flex-1">
                        <div className="flex flex-col gap-0.5">
                          <span
                            className="font-bold text-sm truncate text-slate-800 dark:text-slate-100 tracking-tight"
                            title={item.name}
                          >
                            {item.name}
                          </span>
                          {/* Subtext for Customizations */}
                          {((item.customizations &&
                            item.customizations.length > 0) ||
                            item.spiceLevel) && (
                            <div className="text-[10px] text-slate-500 dark:text-slate-400 flex flex-wrap gap-1">
                              {item.spiceLevel && (
                                <span className="px-1 py-0.5 rounded bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border border-orange-100 dark:border-orange-800/30">
                                  {item.spiceLevel}
                                </span>
                              )}
                              {item.customizations &&
                                item.customizations.map(
                                  (c: any, idx: number) => (
                                    <span
                                      key={idx}
                                      className="px-1 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-800/30"
                                    >
                                      {c.name}
                                    </span>
                                  ),
                                )}
                            </div>
                          )}
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
                            onClick={() => {
                              const current = item.quantity || 0;
                              handleDebouncedUpdate(
                                item,
                                Math.max(0, current - 1),
                              );
                            }}
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
                                handleDebouncedUpdate(item, val);
                              } else {
                                e.target.value = String(item.quantity);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"
                            onClick={() => {
                              const current = item.quantity || 0;
                              handleDebouncedUpdate(item, current + 1);
                            }}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-9 w-9 text-red-500/70 dark:text-red-500/50 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all rounded-xl"
                          onClick={() => handleDeleteAll(item)}
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
