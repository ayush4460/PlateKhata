import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { OrderCard } from './order-card';

type Order = {
  id: string;
  table: string;
  items: { name: string; quantity: number }[];
  time: string;
};

interface OrderColumnProps {
  title: string;
  status: 'new' | 'in-progress' | 'completed';
  orders: Order[];
  onMoveOrder?: (orderId: string) => void;
  actionText?: string;
}

export function OrderColumn({ title, orders, onMoveOrder, actionText }: OrderColumnProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{title} ({orders.length})</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-4 overflow-y-auto">
        {orders.length > 0 ? (
          orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onMoveOrder={onMoveOrder}
              actionText={actionText}
            />
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No orders here.</p>
        )}
      </CardContent>
    </Card>
  );
}
