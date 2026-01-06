"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import {
  Trash2,
  ChevronRight,
  ChevronDown,
  Check,
  X,
  Calendar as CalendarIcon,
  Filter,
  Download,
  Printer,
  Mail,
  Loader2,
} from "lucide-react";
import { generateBillPDF } from "@/lib/bill-generator";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  format,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfToday,
  endOfToday,
  startOfYesterday,
  endOfYesterday,
  startOfDay,
  endOfDay,
} from "date-fns";
import type { DateRange } from "react-day-picker";
import type { PastOrder } from "@/lib/types";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getISTDate, getISTStartOfDay, getISTEndOfDay } from "@/lib/utils";

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
        spiceLevel: (item as any).spiceLevel,
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

  return (
    <div className="p-4 bg-muted/20 border-t shadow-inner">
      <div className="rounded-md border bg-background overflow-hidden">
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
                  {item.spiceLevel && (
                    <Badge
                      variant="outline"
                      className="ml-2 text-xs py-0 h-4 border-orange-200 text-orange-600 bg-orange-50"
                    >
                      {item.spiceLevel}
                    </Badge>
                  )}
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
  const { toast } = useToast();
  const { adminUser } = useAuth();
  const {
    pastOrders,
    approvePayment,
    updatePaymentMethod,
    cancelOrder,
    updateSessionTotal,
    setOrderFilters,
    restaurantName,
    restaurantAddress,
    contactNumber,
    fssaiLicNo,
    gstin,
    restaurantTagline,
  } = useCart();
  const [orderToDelete, setOrderToDelete] = useState<PastOrder | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<
    Record<string, boolean>
  >({});
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Date Filtering State
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: getISTStartOfDay(),
    to: getISTEndOfDay(),
  });
  const [activeFilter, setActiveFilter] = useState<string>("today");

  // Initial Filter Application
  useEffect(() => {
    const from = format(getISTStartOfDay(), "yyyy-MM-dd");
    const to = format(getISTEndOfDay(), "yyyy-MM-dd");
    setOrderFilters({ startDate: from, endDate: to });
  }, []);

  const handlePresetChange = (preset: string) => {
    setActiveFilter(preset);
    let from, to;

    // Use IST Date
    const now = getISTDate();

    switch (preset) {
      case "today":
        from = getISTStartOfDay();
        to = getISTEndOfDay();
        break;
      case "yesterday":
        from = startOfDay(subDays(now, 1));
        to = endOfDay(subDays(now, 1));
        break;
      case "week":
        from = startOfWeek(now, { weekStartsOn: 1 });
        to = endOfWeek(now, { weekStartsOn: 1 });
        break;
      case "month":
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      default:
        return;
    }

    setDateRange({ from, to });
    if (from) {
      setOrderFilters({
        startDate: format(from, "yyyy-MM-dd"),
        endDate: to ? format(to, "yyyy-MM-dd") : format(from, "yyyy-MM-dd"),
      });
    }
  };

  const handleCalendarSelect = (range: DateRange | undefined) => {
    setDateRange(range);
    setActiveFilter("custom");

    if (range?.from) {
      setOrderFilters({
        startDate: format(range.from, "yyyy-MM-dd"),
        endDate: range.to
          ? format(range.to, "yyyy-MM-dd")
          : format(range.from, "yyyy-MM-dd"),
      });
    }
  };

  const handleDownloadBill = (group: any) => {
    try {
      const allItems = group.orders.flatMap((order: PastOrder) =>
        order.items.map((item) => ({
          ...item,
          orderId: order.id,
          orderType: order.orderType,
        }))
      );

      const sessionOrder = {
        id: group.key,
        orderNumber: group.orders[0]?.orderNumber || "BN-0000",
        userName: group.userName || "Guest",
        userPhone: group.userPhone || "",
        tableNumber: group.tableNumber,
        tableId: group.key,
        date: group.orders[0]?.date || Date.now(),
        status: group.status,
        paymentStatus: group.paymentStatus,
        paymentMethod: group.paymentMethod || "Cash",
        total: group.total,
        subtotal: group.subtotal,
        tax: group.tax,
        discount: group.discount,
        orderType: "regular",
        items: allItems.map((i: any) => ({
          id: i.id,
          name: i.name,
          quantity: i.quantity,
          price: i.price,
          category: i.category || "",
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

  const handleSendToCA = async () => {
    if (pastOrders.length === 0) {
      toast({
        title: "No Data",
        description: "No orders to send for this period.",
      });
      return;
    }

    setIsSendingEmail(true);

    try {
      // 1. Generate Excel File Blob
      const wb = XLSX.utils.book_new();
      const ordersByTable: Record<string, any[]> = {};

      pastOrders.forEach((order) => {
        const tableKey = order.tableNumber || "Unknown Table";
        if (!ordersByTable[tableKey]) {
          ordersByTable[tableKey] = [];
        }
        ordersByTable[tableKey].push(order);
      });

      Object.keys(ordersByTable)
        .sort()
        .forEach((tableKey) => {
          const tableOrders = ordersByTable[tableKey];
          const rows = tableOrders.map((order) => {
            const itemsList = order.items
              .map((i: any) => `${i.quantity}x ${i.name}`)
              .join(", ");
            const subtotal =
              order.subtotal ||
              order.total - (order.tax || 0) + (order.discount || 0) ||
              0;

            return {
              "Order Time": format(new Date(order.date), "yyyy-MM-dd HH:mm:ss"),
              "Order ID": order.orderNumber || order.id.slice(0, 8),
              "Customer Name": order.userName || "Guest",
              "Customer Phone": order.userPhone || "",
              "Menu Items": itemsList,
              Subtotal: subtotal,
              Tax: order.tax || 0,
              "Discount / Adjustment": order.discount || 0,
              "Total Bill (Admin)": order.total,
              "Payment Method": order.paymentMethod || "N/A",
              Status: order.status,
              "Payment Status": order.paymentStatus,
            };
          });
          const ws = XLSX.utils.json_to_sheet(rows);
          XLSX.utils.book_append_sheet(wb, ws, `Table ${tableKey}`);
        });

      const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
      const blob = new Blob([excelBuffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // 2. Send to Backend
      const formData = new FormData();
      formData.append(
        "file",
        blob,
        `Orders_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`
      );
      formData.append("reportType", "orders");
      const dateRangeStr = dateRange?.from
        ? `${format(dateRange.from, "dd/MM/yyyy")} - ${
            dateRange.to
              ? format(dateRange.to, "dd/MM/yyyy")
              : format(dateRange.from, "dd/MM/yyyy")
          }`
        : "All Time";
      formData.append("dateRange", dateRangeStr);

      const token = localStorage.getItem("accessToken");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/email/send-report`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send email");
      }

      toast({
        title: "Email Sent",
        description: "Orders report sent to CA successfully.",
      });
    } catch (error) {
      console.error("Failed to send CA email:", error);
      toast({
        variant: "destructive",
        title: "Sending Failed",
        description: (error as Error).message || "Could not send report to CA.",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleExportExcel = () => {
    try {
      if (pastOrders.length === 0) {
        toast({
          title: "No Data",
          description: "No orders to export for this period.",
        });
        return;
      }

      const wb = XLSX.utils.book_new();
      const ordersByTable: Record<string, any[]> = {};
      pastOrders.forEach((order) => {
        const tableKey = order.tableNumber || "Unknown Table";
        if (!ordersByTable[tableKey]) {
          ordersByTable[tableKey] = [];
        }
        ordersByTable[tableKey].push(order);
      });

      Object.keys(ordersByTable)
        .sort()
        .forEach((tableKey) => {
          const tableOrders = ordersByTable[tableKey];
          const rows = tableOrders.map((order) => {
            const itemsList = order.items
              .map((i: any) => `${i.quantity}x ${i.name}`)
              .join(", ");
            const subtotal =
              order.subtotal ||
              order.total - (order.tax || 0) + (order.discount || 0) ||
              0;

            return {
              "Order Time": format(new Date(order.date), "yyyy-MM-dd HH:mm:ss"),
              "Order ID": order.orderNumber || order.id.slice(0, 8),
              "Customer Name": order.userName || "Guest",
              "Customer Phone": order.userPhone || "",
              "Menu Items": itemsList,
              Subtotal: subtotal,
              Tax: order.tax || 0,
              "Discount / Adjustment": order.discount || 0,
              "Total Bill (Admin)": order.total,
              "Payment Method": order.paymentMethod || "N/A",
              Status: order.status,
              "Payment Status": order.paymentStatus,
            };
          });

          const ws = XLSX.utils.json_to_sheet(rows);
          const wscols = [
            { wch: 20 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 40 },
            { wch: 10 },
            { wch: 10 },
            { wch: 10 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
          ];
          ws["!cols"] = wscols;
          XLSX.utils.book_append_sheet(wb, ws, `Table ${tableKey}`);
        });

      const fileName = `Orders_Export_${format(
        new Date(),
        "yyyy-MM-dd_HH-mm"
      )}.xlsx`;
      XLSX.writeFile(wb, fileName);

      toast({
        title: "Export Successful",
        description: `Downloaded ${fileName}`,
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        variant: "destructive",
        title: "Export Failed",
        description: "Could not create Excel file.",
      });
    }
  };

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

        group.sort((a, b) => b.date - a.date);
        const latestOrder = group[0];
        const regularOrder = group.find((o) => o.orderType === "regular");

        let effectivePaymentStatus = latestOrder.paymentStatus;
        let effectivePaymentMethod = (latestOrder as any).paymentMethod;
        let effectivePaymentMethodId = latestOrder.id;

        const approvedOrder = group.find((o) => o.paymentStatus === "Approved");
        const requestedOrder = group.find(
          (o) => o.paymentStatus === "Requested"
        );
        const anyMethodOrder = group.find((o) => (o as any).paymentMethod);

        if (approvedOrder) {
          effectivePaymentStatus = "Approved";
          effectivePaymentMethod = (approvedOrder as any).paymentMethod;
        } else if (requestedOrder) {
          if (effectivePaymentStatus !== "Approved") {
            effectivePaymentStatus = "Requested";
            effectivePaymentMethod = (requestedOrder as any).paymentMethod;
            effectivePaymentMethodId = requestedOrder.id;
          }
        } else if (!effectivePaymentMethod && anyMethodOrder) {
          effectivePaymentMethod = (anyMethodOrder as any).paymentMethod;
          effectivePaymentMethodId = anyMethodOrder.id;
        }

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
          paymentStatus: effectivePaymentStatus,
          paymentMethod: effectivePaymentMethod,
          paymentMethodId: effectivePaymentMethodId,
          total: total,
          subtotal: subtotal,
          tax: tax,
          discount: discount,
          latestId: latestOrder.id,
          sessionId:
            (latestOrder as any).sessionId || (latestOrder as any).session_id,
          regularOrder: regularOrder,
          platform: (latestOrder as any).platform,
        };
      })
      .sort((a, b) => {
        return b.orders[0].date - a.orders[0].date;
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

  return (
    <>
      <AlertDialog
        open={!!orderToDelete}
        onOpenChange={(isOpen) => !isOpen && setOrderToDelete(null)}
      >
        <Card>
          <CardHeader className="flex flex-col space-y-4 pb-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <CardTitle>
                  Orders & Sessions ({groupedOrders.length})
                </CardTitle>
                <CardDescription>
                  {activeFilter === "today" && "Showing orders for today"}
                  {activeFilter === "yesterday" &&
                    "Showing orders for yesterday"}
                  {activeFilter === "week" && "Showing orders for this week"}
                  {activeFilter === "month" && "Showing orders for this month"}
                  {activeFilter === "custom" &&
                    dateRange?.from &&
                    `Showing orders from ${format(
                      dateRange.from,
                      "MMM dd, yyyy"
                    )}` +
                      (dateRange.to
                        ? ` to ${format(dateRange.to, "MMM dd, yyyy")}`
                        : "")}
                </CardDescription>
              </div>

              {/* FIX: Use flex-wrap and gap to prevent overflow */}
              <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-1 rounded-lg">
                <Button
                  variant={activeFilter === "today" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handlePresetChange("today")}
                  className="h-8 text-xs"
                >
                  Today
                </Button>
                <Button
                  variant={activeFilter === "yesterday" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handlePresetChange("yesterday")}
                  className="h-8 text-xs"
                >
                  Yesterday
                </Button>
                <Button
                  variant={activeFilter === "week" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => handlePresetChange("week")}
                  className="h-8 text-xs"
                >
                  This Week
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={
                        activeFilter === "custom" ? "secondary" : "outline"
                      }
                      size="sm"
                      className={cn(
                        "h-8 text-xs justify-start text-left font-normal",
                        !dateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-3 w-3" />
                      {dateRange?.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} -{" "}
                            {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      mode="range"
                      defaultMonth={dateRange?.from}
                      selected={dateRange}
                      onSelect={handleCalendarSelect}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                {/* Excel Export Button */}
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleExportExcel}
                  className="h-8 text-xs bg-green-600 hover:bg-green-700 ml-2"
                >
                  <Download className="mr-2 h-3 w-3" />
                  Excel
                </Button>

                {/* Send to CA Button */}
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleSendToCA}
                  disabled={isSendingEmail}
                  className="h-8 text-xs bg-blue-600 hover:bg-blue-700 ml-2 text-white"
                >
                  {isSendingEmail ? (
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                  ) : (
                    <Mail className="mr-2 h-3 w-3" />
                  )}
                  Send to CA
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {pastOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No orders found for the selected period.</p>
              </div>
            ) : (
              <Tabs defaultValue="orders" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="orders">Orders List</TabsTrigger>
                  {/* Keep tabs for potential future expansion */}
                </TabsList>
                <TabsContent value="orders">
                  {/* FIX: Wrapped Table in overflow-x-auto to handle horizontal scrolling */}
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>Table</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Payment</TableHead>
                          <TableHead className="text-right">
                            Session Total
                          </TableHead>
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
                                expandedSessions[group.key] &&
                                  "bg-muted/40 border-b-0"
                              )}
                              onClick={() => toggleExpand(group.key)}
                              style={{ cursor: "pointer" }}
                            >
                              <TableCell>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleDownloadBill(group)}
                                  title="Download Bill"
                                >
                                  <Printer className="h-4 w-4" />
                                </Button>
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
                                {group.platform ? (
                                  <Badge
                                    variant="secondary"
                                    className={cn(
                                      "text-white uppercase font-bold tracking-wider",
                                      group.platform.toLowerCase() === "zomato"
                                        ? "bg-brand-zomato hover:bg-brand-zomato"
                                        : group.platform.toLowerCase() ===
                                          "swiggy"
                                        ? "bg-brand-swiggy hover:bg-brand-swiggy"
                                        : "bg-blue-600"
                                    )}
                                  >
                                    {group.platform}
                                  </Badge>
                                ) : (
                                  <>Table {group.tableNumber}</>
                                )}
                              </TableCell>
                              <TableCell>
                                {group.userName && (
                                  <div className="font-medium">
                                    {group.userName}
                                  </div>
                                )}
                                {group.userPhone && (
                                  <div className="text-xs text-muted-foreground">
                                    {group.userPhone}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" className="capitalize">
                                  {group.status.toLowerCase()}
                                </Badge>
                              </TableCell>
                              <TableCell onClick={(e) => e.stopPropagation()}>
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

                                  {/* Editable Payment Method for Approved/Requested orders */}
                                  {group.paymentStatus === "Approved" ||
                                  group.paymentStatus === "Requested" ? (
                                    <div onClick={(e) => e.stopPropagation()}>
                                      <Select
                                        defaultValue={group.paymentMethod}
                                        onValueChange={(val) =>
                                          updatePaymentMethod(
                                            group.paymentMethodId,
                                            val,
                                            "Approved"
                                          )
                                        }
                                      >
                                        <SelectTrigger className="h-6 w-[100px] text-[10px] p-1">
                                          <SelectValue
                                            placeholder={
                                              group.paymentMethod || "Select"
                                            }
                                          />
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="Cash">
                                            CASH
                                          </SelectItem>
                                          <SelectItem value="UPI">
                                            UPI
                                          </SelectItem>
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  ) : (
                                    group.paymentMethod && (
                                      <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                        {group.paymentMethod}
                                      </span>
                                    )
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
                                    group.status.toLowerCase() ===
                                      "served") && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() =>
                                        approvePayment(group.latestId)
                                      }
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
                  </div>
                </TabsContent>
              </Tabs>
            )}
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
