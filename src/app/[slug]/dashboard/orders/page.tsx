//app/slug/dashboard/orders/page.tsx
import { RecentOrders } from '@/components/dashboard/recent-orders';

export default function OrdersPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">All Orders</h1>
      <RecentOrders />
    </div>
  );
}
