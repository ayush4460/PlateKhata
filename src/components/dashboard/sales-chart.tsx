"use client";

import {
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfToday,
  endOfToday,
  startOfYear,
  endOfYear,
} from "date-fns";
import {
  getISTDate,
  getISTStartOfDay,
  getISTEndOfDay,
  getISTPeriodEpochRange,
  toISTDisplayDate,
} from "@/lib/utils";

export function SalesChart() {
  const { salesData, advancedDateRange, paymentStats, pastOrders } = useCart(); // paymentStats added to hook

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    // Use advancedDateRange or defaults
    const start = advancedDateRange?.from
      ? advancedDateRange.from.getTime()
      : 0;
    const end = advancedDateRange?.to
      ? advancedDateRange.to.getTime()
      : Date.now();

    // Format start/end for display (convert to Fake Local Date first)
    // Note: advancedDateRange is already Local Date objects usually
    const startDisplay = advancedDateRange?.from || new Date();
    const endDisplay = advancedDateRange?.to || new Date();

    const dateRangeStr = `${format(startDisplay, "MMM d, yyyy")} - ${format(
      endDisplay,
      "MMM d, yyyy"
    )}`;

    // --- Title & Header ---
    doc.setFontSize(20);
    doc.text("Sales Report", 14, 22);

    doc.setFontSize(11);
    doc.text(`Date Range: ${dateRangeStr}`, 14, 30);

    // --- Section 1: Sales Overview (Existing) ---
    doc.setFontSize(14);
    doc.text("Sales Overview", 14, 46);

    const tableData = salesData.map((item) => [
      item.name,
      `Rs. ${item.sales.toFixed(2)}`,
    ]);
    const totalSales = salesData.reduce((acc, curr) => acc + curr.sales, 0);

    autoTable(doc, {
      head: [["Time / Date", "Sales"]],
      body: [
        ...tableData,
        [
          { content: "Total", styles: { fontStyle: "bold" } },
          {
            content: `Rs. ${totalSales.toFixed(2)}`,
            styles: { fontStyle: "bold" },
          },
        ],
      ],
      startY: 50,
      theme: "grid",
    });

    let currentY = (doc as any).lastAutoTable.finalY + 14;

    // --- Section 2: Payment Method Summary ---
    doc.setFontSize(14);
    doc.text("Payment Method Summary", 14, currentY);
    currentY += 4;

    const paymentTableData = paymentStats.map((item) => [
      item.name,
      item.count,
      `Rs. ${item.value.toFixed(2)}`,
    ]);

    autoTable(doc, {
      head: [["Method", "Count", "Total Amount"]],
      body: paymentTableData,
      startY: currentY,
      theme: "grid",
    });

    currentY = (doc as any).lastAutoTable.finalY + 14;

    // --- Section 3: Detailed Payment Logs ---
    // Filter orders matching the period and approved status
    // Note: Re-filtering here to ensure correct listing in PDF
    // const interval = { start, end }; // Unused variable

    // We can cast here because we know pastOrders is an array if we are here (from useCart check)
    const approvedOrders = (pastOrders || []).filter(
      (o) => o.paymentStatus === "Approved" && o.date >= start && o.date <= end
    );

    doc.setFontSize(14);
    doc.text("Detailed Payment Transactions", 14, currentY);
    currentY += 4;

    // Sort by date desc
    const sortedOrders = approvedOrders.sort((a, b) => b.date - a.date);

    const transactionRows = sortedOrders.map((o) => [
      format(toISTDisplayDate(o.date), "MMM d, HH:mm"),
      o.orderNumber || o.id.slice(-6),
      o.paymentMethod || "Unknown",
      `Rs. ${o.total.toFixed(2)}`,
    ]);

    autoTable(doc, {
      head: [["Date/Time", "Order #", "Method", "Amount"]],
      body: transactionRows,
      startY: currentY,
      theme: "striped",
    });

    doc.save(`Sales_Report_${format(new Date(), "yyyyMMdd")}.pdf`);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>
            {advancedDateRange?.from ? (
              <>
                {format(advancedDateRange.from, "MMM d, yyyy")} -{" "}
                {advancedDateRange.to
                  ? format(advancedDateRange.to, "MMM d, yyyy")
                  : "..."}
              </>
            ) : (
              "Select Date Range"
            )}
          </CardDescription>
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDownloadPDF}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={salesData}>
            <XAxis
              dataKey="name"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickMargin={10}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹${value}`}
              tickMargin={10}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                borderRadius: "var(--radius)",
                border: "1px solid hsl(var(--border))",
                boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
              }}
              cursor={{
                stroke: "hsl(var(--muted-foreground))",
                strokeWidth: 1,
                strokeDasharray: "4 4",
              }}
              formatter={(value: number) => [`₹${value.toFixed(2)}`, "Sales"]}
            />
            <Line
              type="monotone"
              dataKey="sales"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
              activeDot={{
                r: 6,
                style: { fill: "hsl(var(--primary))", opacity: 0.8 },
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
