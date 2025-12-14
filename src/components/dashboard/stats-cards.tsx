"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export function StatsCards() {
  const { analytics, analyticsPeriod, setAnalyticsPeriod } = useCart();

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Overview</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4" />
              <span>
                {
                  {
                    daily: "Today",
                    weekly: "This Week",
                    monthly: "This Month",
                    "all-time": "All Time",
                  }[analyticsPeriod]
                }
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end">
            <DropdownMenuLabel>Filter by period</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuRadioGroup
              value={analyticsPeriod}
              onValueChange={(value) =>
                setAnalyticsPeriod(value as AnalyticsPeriod)
              }
            >
              <DropdownMenuRadioItem value="daily">Today</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="weekly">
                This Week
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="monthly">
                This Month
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="all-time">
                All Time
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/dashboard/analytics">
          <Card className="transition-all hover:scale-105 hover:bg-muted/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Revenue
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{analytics.totalRevenue.toFixed(2)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.revenueChangeText}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/orders">
          <Card className="transition-all hover:scale-105 hover:bg-muted/50 cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">New Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+{analytics.newOrders}</div>
              <p className="text-xs text-muted-foreground">
                {analytics.ordersChangeText}
              </p>
            </CardContent>
          </Card>
        </Link>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Avg. Order Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{analytics.avgOrderValue.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              {analytics.avgValueChangeText}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
