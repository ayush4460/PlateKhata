"use client";

import { RecentOrders } from "@/components/dashboard/recent-orders";

export default function SupervisorOrdersPage() {
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 lg:col-span-2">
      <RecentOrders />
    </div>
  );
}
