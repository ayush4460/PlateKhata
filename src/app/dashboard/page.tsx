// src/app/dashboard/page.tsx
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { OnlineSalesChart } from "@/components/dashboard/online-sales-chart";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TableStatus } from "@/components/dashboard/table-status";

export default function DashboardPage() {
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <StatsCards />
      <TableStatus />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4 space-y-4">
          <SalesChart />
          <OnlineSalesChart />
        </div>
        <div className="lg:col-span-3">
          <RecentOrders />
        </div>
      </div>
    </div>
  );
}
