//app/slug/dashboard/online-orders/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useCart } from "@/hooks/use-cart"; // Using useCart for auth helpers, or might need separate service
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Helper to format currency
const formatPrice = (price: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(price);
};

export default function OnlineOrdersPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedOutlet, setSelectedOutlet] = useState<string>("all");

  // Config & History State
  const [configIds, setConfigIds] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Parse config on mount
  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/online-orders/config`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        const data = await res.json();
        if (data.success && data.data) {
          setConfigIds(data.data);
        }
      } catch (e) {
        console.error("Config fetch failed", e);
      }
    };
    fetchConfig();
  }, []);

  const fetchHistory = async () => {
    if (selectedOutlet === "all") return;
    setIsHistoryLoading(true);
    setIsHistoryOpen(true); // Open dialog
    try {
      const token = localStorage.getItem("accessToken");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/online-orders/history/${selectedOutlet}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const data = await res.json();
      let historyList = data.data;
      if (historyList && !Array.isArray(historyList)) {
        // If object, look for 'orders' or any array property
        if (Array.isArray(historyList.orders)) {
          historyList = historyList.orders;
        } else {
          // Fallback: try finding first array value
          const arr = Object.values(historyList).find((v) => Array.isArray(v));
          historyList = arr || [];
        }
      }
      setHistory(Array.isArray(historyList) ? historyList : []);
    } catch (e) {
      toast({ variant: "destructive", title: "History Fetch Failed" });
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // We can't reuse `useCart().pastOrders` directly because that hook logic is complex and mixed with session logic.
  // Best to fetch online orders directly here.
  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/online-orders`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setOrders(data.data || []);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Fetch Failed" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/online-orders/sync`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });

      toast({
        title: "Sync Complete",
        description: "Orders updated from Dyno.",
      });
      fetchOrders();
    } catch (error) {
      toast({ variant: "destructive", title: "Sync Failed" });
    } finally {
      setIsSyncing(false);
    }
  };

  const updateStatus = async (
    orderId: string,
    action: "accept" | "reject" | "ready"
  ) => {
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) return;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/online-orders/${orderId}/${action}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body:
            action === "reject"
              ? JSON.stringify({ reason: "Busy" })
              : undefined,
        }
      );

      if (!res.ok) throw new Error("Action failed");

      toast({ title: `Order ${action}ed` }); // Simple toast
      fetchOrders();
    } catch (error) {
      toast({ variant: "destructive", title: "Action Failed" });
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Extract unique outlet IDs
  const uniqueOutlets = Array.from(
    new Set(orders.map((o) => o.external_outlet_id).filter(Boolean))
  );

  // Filter orders
  const filteredOrders =
    selectedOutlet === "all"
      ? orders
      : orders.filter((o) => o.external_outlet_id === selectedOutlet);

  return (
    <div className="max-w-7xl mx-auto w-full p-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Online Orders</h1>
          <p className="text-muted-foreground">
            Manage orders from Zomato & Swiggy
          </p>
        </div>

        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 w-full md:w-auto">
          <Select value={selectedOutlet} onValueChange={setSelectedOutlet}>
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="All Outlets" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Outlets</SelectItem>
              {configIds.map((cfg: any) => (
                <SelectItem key={cfg.id} value={cfg.id}>
                  <span className="font-medium">
                    {cfg.platform?.toUpperCase()}
                  </span>{" "}
                  - {cfg.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedOutlet !== "all" && (
            <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" onClick={fetchHistory}>
                  View History
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Order History ({selectedOutlet})</DialogTitle>
                </DialogHeader>
                {isHistoryLoading ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {history.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center">
                            No history found.
                          </TableCell>
                        </TableRow>
                      ) : (
                        history.map((h: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>
                              {new Date(
                                h.order_time || h.createdAt
                              ).toLocaleString()}
                            </TableCell>
                            <TableCell>{h.order_id || h.id}</TableCell>
                            <TableCell>{h.customer_name || "Guest"}</TableCell>
                            <TableCell
                              className="max-w-[250px] truncate"
                              title={
                                Array.isArray(h.items)
                                  ? h.items
                                      .map(
                                        (i: any) => `${i.quantity}x ${i.name}`
                                      )
                                      .join(", ")
                                  : ""
                              }
                            >
                              {Array.isArray(h.items)
                                ? h.items
                                    .map((i: any) => `${i.quantity}x ${i.name}`)
                                    .join(", ")
                                : "-"}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {h.order_status || h.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {h.total_amount || h.amount || "-"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                )}
              </DialogContent>
            </Dialog>
          )}

          <Button onClick={handleSync} disabled={isSyncing}>
            {isSyncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync Now
          </Button>
        </div>
      </div>

      {isLoading && orders.length === 0 ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredOrders.length === 0 ? (
            <p className="col-span-3 text-center text-muted-foreground">
              No orders found for this selection.
            </p>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.order_id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-2 mb-2 flex-wrap">
                      <Badge
                        variant={
                          order.external_platform === "zomato"
                            ? "destructive"
                            : "default"
                        }
                      >
                        {order.external_platform?.toUpperCase() || "ONLINE"}
                      </Badge>
                      {order.external_outlet_id && (
                        <Badge variant="outline" className="text-xs">
                          #{order.external_outlet_id}
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground text-right">
                      {new Date(order.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <CardTitle className="text-lg">
                    Order #{order.external_order_id || order.order_id}
                  </CardTitle>
                  <CardDescription>{order.customer_name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      {/* Items list - Assuming we map items properly or show summary */}
                      {/* If items array exists */}
                      {order.items && order.items.length > 0 ? (
                        <ul className="text-sm space-y-1">
                          {order.items.map((item: any, idx: number) => (
                            <li key={idx} className="flex justify-between">
                              <span>
                                {item.quantity}x {item.item_name}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm italic">
                          Items not synced details
                        </p>
                      )}
                    </div>

                    {/* Rider / Instructions Section */}
                    {(order.special_instructions || order.customer_phone) && (
                      <div className="mt-2 text-xs bg-muted p-2 rounded">
                        {order.special_instructions && (
                          <p className="font-medium text-foreground">
                            <span className="font-bold">Note:</span>{" "}
                            {order.special_instructions}
                          </p>
                        )}
                        {order.customer_phone && (
                          <p className="mt-1 flex items-center gap-1">
                            <span className="font-bold">Phone:</span>{" "}
                            {order.customer_phone}
                          </p>
                        )}
                      </div>
                    )}

                    <div className="flex justify-between font-bold border-t pt-2">
                      <span>Total</span>
                      <span>{formatPrice(order.total_amount)}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-4">
                      {order.order_status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() =>
                              updateStatus(order.order_id, "accept")
                            }
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() =>
                              updateStatus(order.order_id, "reject")
                            }
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {(order.order_status === "confirmed" ||
                        order.order_status === "preparing") && (
                        <div className="col-span-2 space-y-2">
                          <div className="text-center text-sm font-semibold text-primary animate-pulse">
                            PREPARING...
                          </div>
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() =>
                              updateStatus(order.order_id, "ready")
                            }
                          >
                            Mark Ready
                          </Button>
                        </div>
                      )}
                      {["ready", "completed", "cancelled"].includes(
                        order.order_status
                      ) && (
                        <div className="col-span-2 text-center py-2 bg-muted rounded text-sm uppercase font-semibold">
                          {order.order_status}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
