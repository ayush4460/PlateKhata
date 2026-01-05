//app/slug/dashboard/analytics/page.tsx
"use client";

import { SalesChart } from "@/components/dashboard/sales-chart";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { PaymentPieChart } from "@/components/dashboard/payment-pie-chart";
import { TopSellingItems } from "@/components/dashboard/top-selling-items";
import { OnlineSalesChart } from "@/components/dashboard/online-sales-chart"; // Imported
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Separator } from "@/components/ui/separator";

import { useCart } from "@/hooks/use-cart";

export default function AnalyticsPage() {
  const {
    paymentStats,
    advancedAnalytics,
    advancedDateRange,
    setAdvancedDateRange,
  } = useCart();

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your revenue, orders, and sales performance.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-background p-1 rounded-lg border shadow-sm">
          <DatePickerWithRange
            className="w-full md:w-[300px]"
            date={advancedDateRange}
            setDate={setAdvancedDateRange}
          />
        </div>
      </div>

      <Separator className="bg-border/50" />

      {/* Key Metrics Row */}
      <div className="animate-in fade-in-50 slide-in-from-bottom-5 duration-500">
        <StatsCards />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 animate-in fade-in-50 slide-in-from-bottom-5 duration-700 delay-100">
        {/* Main Sales Chart - Dominant View */}
        <div className="lg:col-span-5 h-full">
          <SalesChart />
        </div>

        {/* Payment Methods - Sidebar View */}
        <div className="lg:col-span-2 h-full">
          <PaymentPieChart data={paymentStats} />
        </div>
      </div>

      {/* Online Sales Overview */}
      <div className="animate-in fade-in-50 slide-in-from-bottom-5 duration-1000 delay-150">
        <OnlineSalesChart />
      </div>

      {/* Top Selling Items - Full Width Detail */}
      <div className="animate-in fade-in-50 slide-in-from-bottom-5 duration-1000 delay-200">
        {advancedAnalytics && (
          <TopSellingItems data={advancedAnalytics.topSelling} />
        )}
      </div>
    </div>
  );
}
