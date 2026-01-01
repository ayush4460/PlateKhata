"use client";

import {
  Bar,
  BarChart,
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
  const { salesData, analyticsPeriod, paymentStats, pastOrders } = useCart(); // paymentStats added to hook

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const { start, end } = getISTPeriodEpochRange(analyticsPeriod);

    // Format start/end for display (convert to Fake Local Date first)
    const startDisplay = toISTDisplayDate(start);
    const endDisplay = toISTDisplayDate(end);

    const dateRangeStr = `${format(startDisplay, "MMM d, yyyy")} - ${format(
      endDisplay,
      "MMM d, yyyy"
    )}`;

    // --- Title & Header ---
    doc.setFontSize(20);
    doc.text("Sales Report", 14, 22);

    doc.setFontSize(11);
    doc.text(
      `Period: ${
        analyticsPeriod.charAt(0).toUpperCase() + analyticsPeriod.slice(1)
      }`,
      14,
      30
    );
    doc.text(`Date Range: ${dateRangeStr}`, 14, 36);

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
    const interval = { start, end };

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

    doc.save(
      `Sales_Report_${analyticsPeriod}_${format(new Date(), "yyyyMMdd")}.pdf`
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle>Sales Overview</CardTitle>
          <CardDescription>Summary for {analyticsPeriod} view.</CardDescription>
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
          <BarChart data={salesData}>
            <XAxis
              dataKey="name"
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#888888"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => `₹${value}`}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--secondary))" }}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                borderRadius: "var(--radius)",
                border: "1px solid hsl(var(--border))",
              }}
              formatter={(value: number) => [`₹${value.toFixed(2)}`, "Sales"]}
            />
            <Bar
              dataKey="sales"
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
