"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import {
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import type { AnalyticsPeriod } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Link from "next/link";

import { useParams } from "next/navigation"; // Added useParams

export function StatsCards() {
  const { analytics } = useCart();
  const params = useParams();
  const slug = params?.slug as string;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <Link href={`/${slug}/dashboard/analytics`}>
        <Card className="transition-all hover:scale-105 hover:bg-muted/50 cursor-pointer border-none shadow-md bg-gradient-to-br from-background to-secondary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{analytics.totalRevenue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.revenueChangeText}
            </p>
          </CardContent>
        </Card>
      </Link>
      <Link href={`/${slug}/dashboard/orders`}>
        <Card className="transition-all hover:scale-105 hover:bg-muted/50 cursor-pointer border-none shadow-md bg-gradient-to-br from-background to-secondary/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              New Orders
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{analytics.newOrders}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics.ordersChangeText}
            </p>
          </CardContent>
        </Card>
      </Link>
      <Card className="border-none shadow-md bg-gradient-to-br from-background to-secondary/10">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Avg. Order Value
          </CardTitle>
          <TrendingUp className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            ₹{analytics.avgOrderValue.toFixed(2)}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {analytics.avgValueChangeText}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
