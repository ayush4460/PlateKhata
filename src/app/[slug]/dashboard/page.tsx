//src/app/[slug]/dashboard/page.tsx
import { RecentOrders } from "@/components/dashboard/recent-orders";
import { SalesChart } from "@/components/dashboard/sales-chart";
import { OnlineSalesChart } from "@/components/dashboard/online-sales-chart";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { TableStatus } from "@/components/dashboard/table-status";

interface PageProps {
  params: { slug: string };
}

export default function DashboardPage({ params }: PageProps) {
  // Use params.slug if needed for fetching specific dashboard data in the future
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <StatsCards />
      <TableStatus />
      <RecentOrders />
      <div className="grid gap-4 md:grid-cols-2">
        <SalesChart />
        <OnlineSalesChart />
      </div>
    </div>
  );
}
