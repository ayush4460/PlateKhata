"use client";

import { useEffect, useState } from "react";
import { MenuContent } from "@/components/menu/menu-content";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Trash2,
  Minus,
  Plus,
  CreditCard,
  Banknote,
  RotateCcw,
  ChefHat,
  ArrowLeft,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";

interface TableDetailsProps {
  tableId: string;
  slug: string;
}

export function TableDetails({ tableId, slug }: TableDetailsProps) {
  const router = useRouter();
  const { toast } = useToast();
  const {
    setTable,
    clearCart,
    cart,
    updateQuantity,
    removeFromCart,
    getTotalPrice,
    pastOrders: allPastOrders, // Rename to explicitly indicate it might contain all orders
    clearTableSession,
    updateItemInstructions,
    placeOrder,
    updatePaymentMethod,
    tableNumber,
    tableStatuses, // Added to look up table ID
    isTablesLoading, // Added to handle loading state
    setTableId, // Added to sync table ID
  } = useCart();

  // --- Resolve Table ID from URL Param (which is now Table Number) ---
  const [activeTable, setActiveTable] = useState<{
    id: number;
    tableNumber: string;
  } | null>(null);

  useEffect(() => {
    if (isTablesLoading || !tableStatuses || tableStatuses.length === 0) return;

    // The param is now the Table Number (e.g., "1", "A1")
    const targetTableNumber = tableId;

    const foundTable = tableStatuses.find(
      (t) => t.tableNumber === targetTableNumber
    );

    if (foundTable) {
      setActiveTable({
        id: foundTable.id,
        tableNumber: foundTable.tableNumber,
      });

      // Sync Context
      // Store the DATABASE ID in tableId context (for backend ops)
      setTableId(String(foundTable.id));
      // Store the TABLE NUMBER in table context (for display/legacy)
      setTable(foundTable.tableNumber);
    } else {
      console.warn(
        `[TableDetails] Table Number ${targetTableNumber} not found in statuses.`
      );
    }
  }, [tableId, tableStatuses, isTablesLoading, setTable, setTableId]);

  // Filter orders using the RESOLVED Database ID
  const pastOrders = allPastOrders.filter(
    (o) =>
      ((activeTable &&
        (o.tableId === String(activeTable.id) ||
          o.tableNumber === String(activeTable.id))) ||
        (!activeTable && o.tableId === tableId)) && // Fallback
      // Filter out 'settled' orders (Paid AND (Served OR Completed))
      !(
        o.paymentStatus === "Approved" &&
        (o.status === "Served" || o.status === "Completed")
      )
  );

  const totalUnpaidAmount = pastOrders.reduce((sum, order) => {
    if (order.paymentStatus !== "Approved") {
      return sum + order.total;
    }
    return sum;
  }, 0);

  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // --- On Mount: Set Table Context ---
  useEffect(() => {
    if (activeTable) {
      console.log(
        `[TableDetails] Switching to Table #${activeTable.tableNumber} (ID: ${activeTable.id})`
      );
      if (tableNumber !== activeTable.tableNumber) {
        clearCart();
      }
    }
  }, [activeTable, clearCart, tableNumber]);

  const subtotal = getTotalPrice();
  // Assuming tax logic is handled in useCart or we replicate display logic
  // For simplicity, showing subtotal only or we can pull taxRate from useCart if needed.

  const handlePlaceOrder = async () => {
    setIsPlacingOrder(true);
    try {
      // Admin placing order -> "Admin" custom name
      const success = await placeOrder(subtotal, {
        name: "Admin",
        phone: "0000000000",
      });
      if (success) {
        toast({ title: "Order Placed Successfully" });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleClearSession = async () => {
    if (
      confirm(
        "Are you sure you want to clear this table? This will archive current orders and free the table."
      )
    ) {
      // we need numeric id for clearTableSession
      // Use resolved DB ID if available, else try parsing param (fallback)
      const targetId = activeTable ? activeTable.id : Number(tableId);
      await clearTableSession(targetId);
      router.push(`/${slug}/dashboard`);
    }
  };

  const handleMarkPaid = async (method: string) => {
    // Collect all pending order IDs?
    // Logic: Find all active orders and mark them paid ??
    // Actually `updatePaymentMethod` takes an orderId.
    // We might want to "Settle All".
    // For now, let's list the orders and allow settling them individually or collectively.

    // Strategy: Filter unpaid orders
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
    <div className="grid grid-cols-1 lg:grid-cols-3 h-[calc(100vh-4rem)] gap-4 p-4">
      {/* LEFT: MENU (2 Cols) */}
      <div className="lg:col-span-2 border rounded-xl overflow-hidden shadow-sm bg-background flex flex-col">
        <div className="p-2 border-b flex items-center gap-2 bg-muted/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/${slug}/dashboard`)}
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Dashboard
          </Button>
          <span className="font-semibold text-lg">
            Adding items to Table #
            {activeTable ? activeTable.tableNumber : tableId}
          </span>
        </div>
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          <MenuContent
            disableTokenVerification={true}
            enableCartWidget={false}
            customTableId={
              activeTable ? Number(activeTable.tableNumber) : Number(tableId)
            } // Pass Number for display
          />
        </div>
      </div>

      {/* RIGHT: BILL / CART (1 Col) */}
      <div className="lg:col-span-1 flex flex-col gap-4 h-full">
        {/* 1. CURRENT DRAFT (CART) */}
        <Card className="flex flex-col flex-1 min-h-[40%] overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted/50">
            <CardTitle className="text-base flex justify-between items-center">
              <span>Current Selection</span>
              <Badge>{cart.length} items</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground opacity-50">
                <span className="text-sm">Select items from menu</span>
              </div>
            ) : (
              <div className="divide-y">
                {cart.map((item) => (
                  <div key={item.id} className="p-3 flex gap-3">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className="font-medium text-sm">{item.name}</span>
                        <span className="text-sm font-bold">
                          ₹{item.price * item.quantity}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border rounded-md">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="text-xs w-6 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        <Textarea
                          placeholder="Notes..."
                          className="h-7 text-[10px] py-1 min-h-0 resize-none flex-1"
                          value={item.specialInstructions || ""}
                          onChange={(e) =>
                            updateItemInstructions(item.id, e.target.value)
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive"
                          onClick={() => removeFromCart(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
          {cart.length > 0 && (
            <div className="p-3 border-t bg-background">
              <Button
                className="w-full"
                onClick={handlePlaceOrder}
                disabled={isPlacingOrder}
              >
                {isPlacingOrder ? "Placing..." : `Place Order (₹${subtotal})`}
              </Button>
            </div>
          )}
        </Card>

        {/* 2. ACTIVE ORDERS / BILL */}
        <Card className="flex flex-col flex-1 min-h-[40%] overflow-hidden">
          <CardHeader className="py-3 px-4 bg-muted/50">
            <CardTitle className="text-base flex justify-between items-center">
              <span>Active Orders</span>
              {totalUnpaidAmount > 0 && (
                <Badge variant="destructive" className="ml-2">
                  Total Outstanding: ₹{totalUnpaidAmount}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto p-0">
            {pastOrders.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No active orders
              </div>
            ) : (
              <div className="divide-y">
                {pastOrders.map((order) => (
                  <div key={order.id} className="p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <span className="text-xs font-bold text-muted-foreground">
                          #{order.orderNumber}
                        </span>
                        <Badge
                          variant={
                            order.status === "Served" ? "default" : "outline"
                          }
                          className="ml-2 text-[10px] h-5"
                        >
                          {order.status}
                        </Badge>
                      </div>
                      <span className="text-sm font-bold">₹{order.total}</span>
                    </div>
                    <div className="pl-2 border-l-2 text-xs space-y-1 text-muted-foreground">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between">
                          <span>
                            {item.quantity}x {item.name}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 flex justify-end gap-2 text-[10px]">
                      {order.paymentStatus === "Approved" ? (
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          Paid
                        </Badge>
                      ) : (
                        <span className="text-red-500 font-medium">Unpaid</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>

          {/* ACTIONS */}
          <div className="p-3 border-t bg-background space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="text-green-600 border-green-200 hover:bg-green-50"
                onClick={() => handleMarkPaid("Cash")}
              >
                <Banknote className="w-4 h-4 mr-2" /> Cash
              </Button>
              <Button
                variant="outline"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => handleMarkPaid("UPI")}
              >
                <CreditCard className="w-4 h-4 mr-2" /> UPI
              </Button>
            </div>
            <Button
              variant="destructive"
              className="w-full"
              onClick={handleClearSession}
            >
              <RotateCcw className="w-4 h-4 mr-2" /> Clear Table & Finish
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
