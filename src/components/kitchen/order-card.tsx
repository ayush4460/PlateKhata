// src/components/kitchen/order-card.tsx
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type Order = {
  id: string;
  table: string;
  items: { name: string; quantity: number }[];
  time: string;
  orderType?: 'regular' | 'addon';
};

interface OrderCardProps {
  order: Order;
  onMoveOrder?: (orderId: string) => void;
  actionText?: string;
}

export function OrderCard({ order, onMoveOrder, actionText }: OrderCardProps) {
  const isAddon = order.orderType === 'addon';

  return (
    <Card
      className={cn(
        "bg-background transition-all",
        isAddon ? "border-orange-500 border-2 shadow-md" : ""
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
                <CardTitle className="text-base font-medium">Table {order.table}</CardTitle>

                {isAddon && (
                    <Badge variant="destructive" className="h-5 px-1.5 text-[10px] uppercase font-bold tracking-wider animate-pulse">
                        Add-on
                    </Badge>
                )}

            </div>
            <div className="text-sm text-muted-foreground">{order.time}</div>
        </div>
      </CardHeader>

      <CardContent>
        <Separator className="my-2" />
        <ul className="space-y-1">
          {order.items.map((item, index) => (
            <li key={index} className="flex justify-between">
              <span className="flex-1 pr-2 text-sm">{item.name}</span>
              <span className="font-bold text-sm">x{item.quantity}</span>
            </li>
          ))}
        </ul>
      </CardContent>

      {onMoveOrder && actionText && (
        <CardFooter>
          <Button
            className={cn("w-full", isAddon && "bg-orange-600 hover:bg-orange-700")}
            onClick={() => onMoveOrder(order.id)}
          >
            {actionText}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}