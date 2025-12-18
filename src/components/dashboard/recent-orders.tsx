"use client";
import React, { useState, useMemo, useEffect } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// I will split this into two calls or use multi_replace.
// I'll use multi_replace.
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
} from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
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
} from "date-fns";
import type { DateRange } from "react-day-picker";
import type { PastOrder } from "@/lib/types";
import * as XLSX from "xlsx";
import { useToast } from "@/hooks/use-toast";

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
        spiceLevel: (item as any).spiceLevel, // Added
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
  const {
    pastOrders,
    approvePayment,
    updatePaymentMethod,
    cancelOrder,
    updateSessionTotal,
    setOrderFilters,
  } = useCart();
  const [orderToDelete, setOrderToDelete] = useState<PastOrder | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<
    Record<string, boolean>
  >({});

  // Date Filtering State
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: startOfToday(),
    to: endOfToday(),
  });
  const [activeFilter, setActiveFilter] = useState<string>("today");

  // Initial Filter Application
  useEffect(() => {
    // Apply default "Today" filter on mount
    // We do this to ensure we show today's orders by default as requested
    const from = format(startOfToday(), "yyyy-MM-dd");
    const to = format(endOfToday(), "yyyy-MM-dd");
    setOrderFilters({ startDate: from, endDate: to });
  }, []);

  const handlePresetChange = (preset: string) => {
    setActiveFilter(preset);
    let from, to;
    const now = new Date();

    switch (preset) {
      case "today":
        from = startOfToday();
        to = endOfToday();
        break;
      case "yesterday":
        from = startOfYesterday();
        to = endOfYesterday();
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
      // 1. Consolidate Items
      const allItems = group.orders.flatMap((order: PastOrder) =>
        order.items.map((item) => ({
          ...item,
          orderId: order.id,
          orderType: order.orderType,
        }))
      );

      // 2. Setup PDF (Thermal Receipt size: 80mm width, dynamic height approx 200mm start)
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: [80, 2000], // Long strip for roll paper simulation
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 5;
      const contentWidth = pageWidth - margin * 2;
      let yPos = 10;

      // Unmount logic to check if we can reduce height at the end? jsPDF doesn't resize easily.
      // We'll proceed with standard thermal layout.

      // 3. Header
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("MuchMate Restaurant", pageWidth / 2, yPos, { align: "center" });
      yPos += 5;

      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text("Original Recipe of Taste", pageWidth / 2, yPos, {
        align: "center",
      });
      yPos += 7;

      doc.text(`Date: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, margin, yPos);
      yPos += 4;
      doc.text(`Table: ${group.tableNumber}`, margin, yPos);
      doc.text(`Bill No: ${group.key.slice(0, 8)}`, pageWidth - margin, yPos, {
        align: "right",
      });
      yPos += 6;

      // 4. Items Table
      const tableHeaders = [["Item", "Qty", "Price", "Amt"]];
      const tableBody = allItems.map((item: any) => [
        item.name.substring(0, 15) + (item.name.length > 15 ? "..." : ""), // Truncate name
        item.quantity.toString(),
        item.price.toFixed(2),
        (item.price * item.quantity).toFixed(2),
      ]);

      autoTable(doc, {
        head: tableHeaders,
        body: tableBody,
        startY: yPos,
        theme: "plain", // Minimalist for thermal
        styles: { fontSize: 8, cellPadding: 1, overflow: "linebreak" },
        headStyles: { fontStyle: "bold", borderBottomWidth: 0.5, lineColor: 0 },
        columnStyles: {
          0: { cellWidth: 25 },
          1: { cellWidth: 10, halign: "center" },
          2: { cellWidth: 15, halign: "right" },
          3: { cellWidth: 15, halign: "right" },
        },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => {
          yPos = data.cursor.y;
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 5;

      // 5. Totals
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");

      const addLine = (label: string, value: string) => {
        doc.text(label, pageWidth - margin - 35, yPos); // Label x-pos
        doc.text(value, pageWidth - margin, yPos, { align: "right" }); // Value x-pos
        yPos += 4;
      };

      addLine("Subtotal:", group.subtotal.toFixed(2));
      addLine("Tax:", group.tax.toFixed(2));
      if (group.discount > 0) {
        addLine("Discount:", `-${group.discount.toFixed(2)}`);
      }

      // Divider
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;

      doc.setFontSize(10);
      addLine("TOTAL:", `Rs ${group.total.toFixed(2)}`);

      yPos += 2;
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      doc.text(`Mode: ${group.paymentMethod || "Pending"}`, margin, yPos);

      yPos += 10;
      doc.text("*** Thank You ***", pageWidth / 2, yPos, { align: "center" });

      // 6. Save
      doc.save(`Bill_${group.tableNumber}_${group.key.slice(0, 6)}.pdf`);
    } catch (e) {
      console.error("Download failed", e);
      toast({
        variant: "destructive",
        title: "Download failed",
        description: "Could not generate bill PDF",
      });
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

      // 1. Group orders by Table
      const ordersByTable: Record<string, any[]> = {};
      pastOrders.forEach((order) => {
        const tableKey = order.tableNumber || "Unknown Table";
        if (!ordersByTable[tableKey]) {
          ordersByTable[tableKey] = [];
        }
        ordersByTable[tableKey].push(order);
      });

      // 2. Create Sheet per Table
      Object.keys(ordersByTable)
        .sort()
        .forEach((tableKey) => {
          const tableOrders = ordersByTable[tableKey];

          const rows = tableOrders.map((order) => {
            // Format Items List
            const itemsList = order.items
              .map((i: any) => `${i.quantity}x ${i.name}`)
              .join(", ");

            // Calculate breakdown if missing
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
              "Total Bill (Admin)": order.total, // This is the final value
              "Payment Method": order.paymentMethod || "N/A",
              Status: order.status,
              "Payment Status": order.paymentStatus,
            };
          });

          const ws = XLSX.utils.json_to_sheet(rows);

          // Auto-width columns (basic heuristic)
          const wscols = [
            { wch: 20 }, // Time
            { wch: 15 }, // ID
            { wch: 15 }, // Name
            { wch: 15 }, // Phone
            { wch: 40 }, // Items
            { wch: 10 }, // Subtotal
            { wch: 10 }, // Tax
            { wch: 10 }, // Discount
            { wch: 15 }, // Total
            { wch: 15 }, // Payment Method
            { wch: 15 }, // Status
            { wch: 15 }, // Payment Status
          ];
          ws["!cols"] = wscols;

          XLSX.utils.book_append_sheet(wb, ws, `Table ${tableKey}`);
        });

      // 3. Save File
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

  // Group orders by session_id (Existing logic)
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

        // Find effective payment status and method (Prioritize Approved > Requested > Latest)
        let effectivePaymentStatus = latestOrder.paymentStatus;
        let effectivePaymentMethod = (latestOrder as any).paymentMethod;
        let effectivePaymentMethodId = latestOrder.id; // Initialize with latest ID

        const approvedOrder = group.find((o) => o.paymentStatus === "Approved");
        const requestedOrder = group.find(
          (o) => o.paymentStatus === "Requested"
        );
        // Fallback: find any order with a method if current is null
        const anyMethodOrder = group.find((o) => (o as any).paymentMethod);

        if (approvedOrder) {
          effectivePaymentStatus = "Approved";
          effectivePaymentMethod = (approvedOrder as any).paymentMethod;
        } else if (requestedOrder) {
          // Only override if not already approved
          if (effectivePaymentStatus !== "Approved") {
            effectivePaymentStatus = "Requested";
            effectivePaymentMethod = (requestedOrder as any).paymentMethod;
            effectivePaymentMethodId = requestedOrder.id; // Set ID from requested order
          }
        } else if (!effectivePaymentMethod && anyMethodOrder) {
          effectivePaymentMethod = (anyMethodOrder as any).paymentMethod;
          effectivePaymentMethodId = anyMethodOrder.id; // Added ID here
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
          paymentMethodId: effectivePaymentMethodId, // Exposed ID
          total: total,
          subtotal: subtotal,
          tax: tax,
          discount: discount,
          latestId: latestOrder.id,
          sessionId:
            (latestOrder as any).sessionId || (latestOrder as any).session_id,
          regularOrder: regularOrder,
          platform: (latestOrder as any).platform, // Added
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

  return (
    <>
      <AlertDialog
        open={!!orderToDelete}
        onOpenChange={(isOpen) => !isOpen && setOrderToDelete(null)}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div className="space-y-1">
              <CardTitle>Orders & Sessions ({groupedOrders.length})</CardTitle>
              <CardDescription>
                {activeFilter === "today" && "Showing orders for today"}
                {activeFilter === "yesterday" && "Showing orders for yesterday"}
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

            {/* Filter Controls */}
            <div className="flex items-center space-x-2 bg-muted/30 p-1 rounded-lg">
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
            </div>
          </CardHeader>

          <CardContent>
            {pastOrders.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p>No orders found for the selected period.</p>
              </div>
            ) : (
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
                                  ? "bg-red-600 hover:bg-red-700"
                                  : group.platform.toLowerCase() === "swiggy"
                                  ? "bg-orange-500 hover:bg-orange-600"
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
                                    <SelectItem value="Cash">CASH</SelectItem>
                                    <SelectItem value="UPI">UPI</SelectItem>
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
