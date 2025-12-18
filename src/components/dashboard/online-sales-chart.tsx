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
} from "recharts";
import { useCart } from "@/hooks/use-cart";
import { useMemo } from "react";
import { format, subDays, isSameDay } from "date-fns";

export function OnlineSalesChart() {
  const { pastOrders } = useCart();

  const data = useMemo(() => {
    // Filter only online orders
    const onlineOrders = pastOrders.filter((o) => o.orderType === "online");

    // Group by day for last 7 days
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return {
        date: d,
        day: format(d, "EEE"),
        total: 0,
      };
    });

    onlineOrders.forEach((order) => {
      const orderDate = new Date(order.date);
      const dayStat = last7Days.find((d) => isSameDay(d.date, orderDate));
      if (dayStat) {
        dayStat.total += order.total;
      }
    });

    return last7Days;
  }, [pastOrders]);

  return (
    <Card className="col-span-4">
      <CardHeader>
        <CardTitle>Online Sales Overview</CardTitle>
        <CardDescription>
          Revenue from Zomato/Swiggy over the last 7 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="pl-2">
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={data}>
            <XAxis
              dataKey="day"
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
              formatter={(value: number) => [`₹${value}`, "Revenue"]}
              labelStyle={{ color: "black" }}
            />
            <Bar dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
