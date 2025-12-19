"use client";

import { SalesChart } from "@/components/dashboard/sales-chart";
import { StatsCards } from "@/components/dashboard/stats-cards";

import { PaymentPieChart } from "@/components/dashboard/payment-pie-chart"; // Added
import { useCart } from "@/hooks/use-cart";

export default function AnalyticsPage() {
  const { paymentStats } = useCart();
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8">
      <h1 className="text-2xl font-bold">Analytics</h1>
      <StatsCards />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <SalesChart />
        </div>
        <div className="col-span-3">
          <PaymentPieChart data={paymentStats} />
        </div>
      </div>
    </div>
  );
}
