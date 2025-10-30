// src/components/dashboard/recent-orders.tsx
'use client';
import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart';
import { Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import type { PastOrder } from '@/lib/types';

export function RecentOrders() {
  // Use cancelOrder (which maps to deleteOrder in the hook)
  const { pastOrders, approvePayment, cancelOrder } = useCart();
  const [orderToDelete, setOrderToDelete] = useState<PastOrder | null>(null);

  // Sort all orders by date, newest first
  const allOrders = [...pastOrders].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  
  const handleDelete = () => {
    if (orderToDelete) {
      cancelOrder(orderToDelete.id); // Call cancelOrder
      setOrderToDelete(null);
    }
  }

  return (
    <AlertDialog open={!!orderToDelete} onOpenChange={(isOpen) => !isOpen && setOrderToDelete(null)}>
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Table</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {allOrders.slice(0, 10).map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">#{order.id.slice(-6)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{order.userName}</div>
                    <div className="text-sm text-muted-foreground">{order.userPhone}</div>
                  </TableCell>
                  <TableCell className="font-medium">{order.tableNumber}</TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[200px] truncate">
                    {order.items.map(item => `${item.name} (x${item.quantity})`).join(', ')}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        'capitalize',
                        // Match backend status strings for coloring
                        (order.status === 'completed' || order.status === 'served') && 'bg-green-100 text-green-800 border-green-200',
                        (order.status === 'preparing' || order.status === 'ready') && 'bg-blue-100 text-blue-800 border-blue-200',
                        (order.status === 'pending' || order.status === 'confirmed') && 'bg-yellow-100 text-yellow-800 border-yellow-200',
                        order.status === 'cancelled' && 'bg-red-100 text-red-800 border-red-200'
                      )}
                    >
                      {order.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={order.paymentStatus === 'Approved' ? 'default' : 'secondary'}
                      className={cn(
                        'capitalize',
                        order.paymentStatus === 'Approved' && 'bg-green-100 text-green-800 border-green-200',
                        order.paymentStatus === 'Pending' && 'bg-orange-100 text-orange-800 border-orange-200'
                      )}
                    >
                      {order.paymentStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">₹{order.total.toFixed(2)}</TableCell>
                  <TableCell className="flex items-center gap-1">
                    
                    {/* --- MODIFIED CONDITION --- */}
                    {/* Only show Approve button if payment is Pending AND order is Ready or Served */}
                    {order.paymentStatus === 'Pending' && (order.status === 'ready' || order.status === 'served') && (
                    // --- END MODIFICATION ---
                      <Button variant="outline" size="sm" onClick={() => approvePayment(order.id)}>
                        Approve
                      </Button>
                    )}

                    {/* Only show cancel button if status is 'pending' or 'confirmed' */}
                    {(order.status === 'pending' || order.status === 'confirmed') && (
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setOrderToDelete(order)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel order #{orderToDelete?.id.slice(-6)}. This action can only be done on pending or confirmed orders.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Back</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className={cn(buttonVariants({variant: 'destructive'}))}>Cancel Order</AlertDialogAction>
          </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}