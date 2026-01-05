//app/slug/dashboard/analytics/page.tsx
"use client";

import { SalesChart } from "@/components/dashboard/sales-chart";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { PaymentPieChart } from "@/components/dashboard/payment-pie-chart";
import { TopSellingItems } from "@/components/dashboard/top-selling-items";
import { RevenueCalendarChart } from "@/components/dashboard/revenue-calendar-chart";
import { useCart } from "@/hooks/use-cart";

export default function AnalyticsPage() {
  const {
    paymentStats,
    advancedAnalytics,
    advancedDateRange,
    setAdvancedDateRange,
  } = useCart();

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          Analytics Dashboard
        </h1>
      </div>

      <StatsCards />

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {advancedAnalytics && (
          <RevenueCalendarChart
            data={advancedAnalytics.revenueSeries}
            dateRange={advancedDateRange}
            onRangeChange={setAdvancedDateRange}
          />
        )}
        <div className="col-span-3">
          <PaymentPieChart data={paymentStats} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <SalesChart />
        </div>
        {advancedAnalytics && (
          <TopSellingItems data={advancedAnalytics.topSelling} />
        )}
      </div>
    </div>
  );
}
