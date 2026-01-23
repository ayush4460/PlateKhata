"use client";

import { RecentOrders } from "@/components/dashboard/recent-orders";
import { TableStatus } from "@/components/dashboard/table-status";

interface PageProps {
  params: { slug: string };
}

export default function SupervisorDashboardPage({ params }: PageProps) {
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <TableStatus />
    </div>
  );
}
