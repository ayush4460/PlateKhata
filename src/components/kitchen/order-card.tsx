import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

type Order = {
  id: string;
  table: string;
  items: { name: string; quantity: number }[];
  time: string;
};

interface OrderCardProps {
  order: Order;
  onMoveOrder?: (orderId: string) => void;
  actionText?: string;
}

export function OrderCard({ order, onMoveOrder, actionText }: OrderCardProps) {
  return (
    <Card className="bg-background">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base font-medium">Table {order.table}</CardTitle>
        <div className="text-sm text-muted-foreground">{order.time}</div>
      </CardHeader>
      <CardContent>
        <Separator className="my-2" />
        <ul className="space-y-1">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between">
              <span className="flex-1 pr-2">{item.name}</span>
              <span className="font-bold">x{item.quantity}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      {onMoveOrder && actionText && (
        <CardFooter>
          <Button className="w-full" onClick={() => onMoveOrder(order.id)}>
            {actionText}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
