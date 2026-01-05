"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Globe } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { useMemo } from "react";
import { format, subDays, isSameDay, eachDayOfInterval } from "date-fns";

export function OnlineSalesChart() {
  const { pastOrders, advancedDateRange } = useCart();

  const data = useMemo(() => {
    // 1. Filter only online orders
    const onlineOrders = pastOrders.filter((o) => o.orderType === "online");

    // 2. Determine date range (from context or default to last 7 days)
    const end = advancedDateRange?.to || new Date();
    const start = advancedDateRange?.from || subDays(new Date(), 7);

    // 3. Generate date buckets based on range duration
    // If range < 30 days, show daily. Else show monthly?
    // For simplicity, let's stick to daily distribution for now as it's a bar chart.
    // If range is large, bar chart might get crowded.

    // Simple approach: Map orders to days in the range.
    // We can use eachDayOfInterval to generate keys.
    const allDays = eachDayOfInterval({ start, end });

    // Map: "MMM d" -> Total
    const salesMap: Record<string, number> = {};

    allDays.forEach((day) => {
      salesMap[format(day, "MMM d")] = 0;
    });

    onlineOrders.forEach((order) => {
      if (order.date >= start.getTime() && order.date <= end.getTime()) {
        const orderDate = new Date(order.date);
        const key = format(orderDate, "MMM d");
        if (salesMap[key] !== undefined) {
          salesMap[key] += order.total;
        }
      }
    });

    return Object.entries(salesMap).map(([day, total]) => ({
      day,
      total,
    }));
  }, [pastOrders, advancedDateRange]);

  return (
    <Card className="col-span-4 border-none shadow-md bg-gradient-to-br from-background to-secondary/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Online Sales Overview
        </CardTitle>
        <CardDescription>Revenue from Zomato/Swiggy.</CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              opacity={0.2}
              stroke="hsl(var(--muted-foreground))"
            />
            <XAxis
              dataKey="day"
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
              cursor={{ fill: "hsl(var(--muted)/0.5)" }}
              contentStyle={{
                backgroundColor: "hsl(var(--background))",
                borderColor: "hsl(var(--border))",
                borderRadius: "var(--radius)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}
              formatter={(value: number) => [
                `₹${value.toLocaleString("en-IN")}`,
                "Revenue",
              ]}
              labelStyle={{
                color: "hsl(var(--foreground))",
                fontWeight: "bold",
              }}
            />
            <Bar
              dataKey="total"
              fill="hsl(var(--primary))"
              radius={[6, 6, 0, 0]}
              fillOpacity={0.9}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
