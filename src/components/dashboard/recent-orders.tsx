// src/components/dashboard/recent-orders.tsx
"use client";
import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { Trash2, ChevronRight, ChevronDown, Check, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { PastOrder } from "@/lib/types";

// Sub-component for the expanded session details
function SessionDetails({
  group,
  onUpdateTotal,
}: {
  group: any;
  onUpdateTotal: (sessionId: string, newTotal: number) => void;
}) {
  const [overrideAmount, setOverrideAmount] = useState<string>(
    group.total.toString()
  );
  const [isEditing, setIsEditing] = useState(false);

  // Consolidate all items from all orders in the session
  const allItems = useMemo(() => {
    return group.orders.flatMap((order: PastOrder) =>
      order.items.map((item) => ({
        ...item,
        orderId: order.id,
        orderType: order.orderType,
        orderNumber: order.orderNumber,
      }))
    );
  }, [group.orders]);

  const handleUpdateClick = () => {
    const val = parseFloat(overrideAmount);
    if (!isNaN(val)) {
      onUpdateTotal(group.key, val);
      setIsEditing(false);
    }
  };

  const calculatedOriginal = group.subtotal + group.tax;
  const variance = calculatedOriginal - group.total;
  // If variance is positive, it means there is a discount (or adjustment downwards)
  // If variance is negative, it means surcharge (total > sub+tax)

  return (
    <div className="p-4 bg-muted/20 border-t shadow-inner">
      <div className="rounded-md border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Details</TableHead>
              <TableHead className="text-center">Type</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allItems.map((item: any, idx: number) => (
              <TableRow key={`${item.orderId}-${idx}`}>
                <TableCell className="font-medium">
                  {item.name}
                  {item.orderType === "addon" && (
                    <span className="text-xs text-muted-foreground ml-2">
                      (Add-on #
                      {item.orderNumber?.slice(-4) || item.orderId.slice(-4)})
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={
                      item.orderType === "addon" ? "secondary" : "outline"
                    }
                    className="text-[10px]"
                  >
                    {item.orderType || "Regular"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  ₹{item.price.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">x{item.quantity}</TableCell>
                <TableCell className="text-right">
                  ₹{(item.price * item.quantity).toFixed(2)}
                </TableCell>
              </TableRow>
            ))}

            {/* Total Calculation breakdown */}
            <TableRow className="bg-muted/50 font-medium border-t-2 text-xs text-muted-foreground">
              <TableCell colSpan={3} className="text-right">
                Subtotal + Tax:
              </TableCell>
              <TableCell className="text-right" colSpan={2}>
                ₹{calculatedOriginal.toFixed(2)}
              </TableCell>
            </TableRow>

            {Math.abs(variance) > 0.01 && (
              <TableRow className="bg-muted/50 font-medium border-0 text-xs text-green-600">
                <TableCell colSpan={3} className="text-right">
                  Discount / Adjustment:
                </TableCell>
                <TableCell className="text-right" colSpan={2}>
                  - ₹{variance.toFixed(2)}
                </TableCell>
              </TableRow>
            )}

            {/* Override Total Row */}
            <TableRow className="bg-muted/50">
              <TableCell colSpan={3} className="text-right py-4 align-middle">
                <span className="text-sm font-bold mr-2">
                  Final Session Total:
                </span>
              </TableCell>
              <TableCell colSpan={2} className="text-right py-4">
                <div className="flex items-center justify-end gap-2">
                  {isEditing ? (
                    <>
                      <Input
                        type="number"
                        value={overrideAmount}
                        onChange={(e) => setOverrideAmount(e.target.value)}
                        className="h-8 w-24 text-right"
                        autoFocus
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-100"
                        onClick={handleUpdateClick}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-100"
                        onClick={() => {
                          setIsEditing(false);
                          setOverrideAmount(group.total.toString());
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <span
                        className={cn(
                          "font-bold text-lg",
                          parseFloat(overrideAmount) !== group.total
                            ? "text-blue-600"
                            : ""
                        )}
                      >
                        ₹{group.total.toFixed(2)}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs ml-2"
                        onClick={() => {
                          setOverrideAmount(group.total.toString());
                          setIsEditing(true);
                        }}
                      >
                        Edit
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function RecentOrders() {
  const { pastOrders, approvePayment, cancelOrder, updateSessionTotal, toast } =
    useCart();
  const [orderToDelete, setOrderToDelete] = useState<PastOrder | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<
    Record<string, boolean>
  >({});

  // Group orders by session_id
  const groupedOrders = useMemo(() => {
    const groups: Record<string, PastOrder[]> = {};

    pastOrders.forEach((order) => {
      const sessionKey =
        (order as any).sessionId ||
        (order as any).session_id ||
        `fallback-${order.id}`;

      if (!groups[sessionKey]) groups[sessionKey] = [];
      groups[sessionKey].push(order);
    });

    const result = Object.values(groups)
      .map((group) => {
        const total = group.reduce((sum, o) => sum + o.total, 0);
        const subtotal = group.reduce((sum, o) => sum + (o.subtotal || 0), 0);
        const tax = group.reduce((sum, o) => sum + (o.tax || 0), 0);
        const discount = group.reduce((sum, o) => sum + (o.discount || 0), 0);

        group.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const latestOrder = group[0];
        const regularOrder = group.find((o) => o.orderType === "regular");

        return {
          key:
            (latestOrder as any).sessionId ||
            (latestOrder as any).session_id ||
            `fallback-${latestOrder.id}`,
          orders: group,
          tableNumber: latestOrder.tableNumber,
          userName: latestOrder.userName,
          userPhone: latestOrder.userPhone,
          status: latestOrder.status,
          paymentStatus: latestOrder.paymentStatus,
          paymentMethod: (latestOrder as any).paymentMethod,
          total: total,
          subtotal: subtotal,
          tax: tax,
          discount: discount,
          latestId: latestOrder.id,
          sessionId:
            (latestOrder as any).sessionId || (latestOrder as any).session_id,
          regularOrder: regularOrder,
        };
      })
      .sort((a, b) => {
        return (
          new Date(b.orders[0].date).getTime() -
          new Date(a.orders[0].date).getTime()
        );
      });

    return result;
  }, [pastOrders]);

  const toggleExpand = (key: string) => {
    setExpandedSessions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDelete = () => {
    if (orderToDelete) {
      if (orderToDelete.orderType === "addon") {
        const isOnlyOrder =
          groupedOrders.find((g) => g.key === orderToDelete.sessionId)?.orders
            .length === 1;
        if (isOnlyOrder) {
          toast({
            title: "Warning",
            description: "Deleting the last order will clear the session.",
          });
        }
      }

      cancelOrder(orderToDelete.id);
      setOrderToDelete(null);

      if (orderToDelete.orderType === "addon") {
        toast({
          title: "Add-on Removed",
          description: "The add-on order has been removed from the session.",
        });
      } else {
        toast({
          title: "Order Cancelled",
          description: "The order has been cancelled.",
        });
      }
    }
  };

  const handleUpdateTotal = (sessionId: string, newTotal: number) => {
    updateSessionTotal(sessionId, newTotal);
  };

  if (pastOrders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            No active orders
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <AlertDialog
        open={!!orderToDelete}
        onOpenChange={(isOpen) => !isOpen && setOrderToDelete(null)}
      >
        <Card>
          <CardHeader>
            <CardTitle>Active Sessions ({groupedOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Session Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedOrders.map((group) => (
                  <React.Fragment key={group.key}>
                    {/* PARENT ROW */}
                    <TableRow
                      className={cn(
                        "hover:bg-muted/40 transition-colors",
                        expandedSessions[group.key] && "bg-muted/40 border-b-0"
                      )}
                      onClick={() => toggleExpand(group.key)}
                      style={{ cursor: "pointer" }}
                    >
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleExpand(group.key);
                          }}
                        >
                          {expandedSessions[group.key] ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-bold">
                        Table {group.tableNumber}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{group.userName}</div>
                        <div className="text-xs text-muted-foreground">
                          {group.userPhone}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {group.status.toLowerCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge
                            variant={
                              group.paymentStatus === "Approved"
                                ? "default"
                                : "secondary"
                            }
                            className="w-fit"
                          >
                            {group.paymentStatus}
                          </Badge>
                          {group.paymentMethod && (
                            <span className="text-[10px] font-bold text-muted-foreground uppercase">
                              {group.paymentMethod}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-bold">
                        ₹{group.total.toFixed(2)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {(group.paymentStatus === "Pending" ||
                          group.paymentStatus === "Requested") &&
                          (group.status.toLowerCase() === "ready" ||
                            group.status.toLowerCase() === "served") && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => approvePayment(group.latestId)}
                            >
                              Approve Payment
                            </Button>
                          )}
                      </TableCell>
                    </TableRow>

                    {/* EXPANDED DETAILS */}
                    {expandedSessions[group.key] && (
                      <TableRow className="bg-muted/10">
                        <TableCell colSpan={7} className="p-0">
                          <SessionDetails
                            group={group}
                            onUpdateTotal={handleUpdateTotal}
                          />
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
            <AlertDialogDescription>
              {orderToDelete?.orderType === "addon" ? (
                <>
                  This will cancel the add-on order. The main session will
                  remain.
                </>
              ) : (
                <>
                  This will cancel the regular order and may close the session.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToDelete(null)}>
              Back
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className={cn(buttonVariants({ variant: "destructive" }))}
            >
              Cancel Order
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
