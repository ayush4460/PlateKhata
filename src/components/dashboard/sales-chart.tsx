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

export function SalesChart() {
  const { salesData, analyticsPeriod } = useCart();

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    const now = new Date();
    let start, end;

    if (analyticsPeriod === "daily") {
      start = startOfToday();
      end = endOfToday();
    } else if (analyticsPeriod === "weekly") {
      start = startOfWeek(now, { weekStartsOn: 1 });
      end = endOfWeek(now, { weekStartsOn: 1 });
    } else if (analyticsPeriod === "monthly") {
      start = startOfMonth(now);
      end = endOfMonth(now);
    } else {
      start = startOfYear(now);
      end = endOfYear(now);
    }

    const dateRangeStr = `${format(start, "MMM d, yyyy")} - ${format(
      end,
      "MMM d, yyyy"
    )}`;

    doc.setFontSize(20);
    doc.text("Sales Overview", 14, 22);

    doc.setFontSize(11);
    doc.text(
      `Period: ${
        analyticsPeriod.charAt(0).toUpperCase() + analyticsPeriod.slice(1)
      }`,
      14,
      30
    );
    doc.text(`Date Range: ${dateRangeStr}`, 14, 36);

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
      startY: 44,
    });

    doc.save(`Sales_Report_${analyticsPeriod}_${format(now, "yyyyMMdd")}.pdf`);
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
