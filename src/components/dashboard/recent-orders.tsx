// src/components/dashboard/recent-orders.tsx - DEBUG VERSION
'use client';
import React, { useState, useMemo } from 'react';
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
import { useCart} from '@/hooks/use-cart';
import { Trash2, ChevronRight, ChevronDown} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { PastOrder } from '@/lib/types';

export function RecentOrders() {
  const { pastOrders, approvePayment, cancelOrder, toast } = useCart();
  const [orderToDelete, setOrderToDelete] = useState<PastOrder | null>(null);
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  //console.log('=== RECENT ORDERS DEBUG ===');
  //console.log('Total pastOrders:', pastOrders.length);
  //console.log('Sample order:', pastOrders[0]);

  // Group orders by session_id
  const groupedOrders = useMemo(() => {
    const groups: Record<string, PastOrder[]> = {};

    pastOrders.forEach(order => {
        const sessionKey = (order as any).sessionId || (order as any).session_id || `fallback-${order.id}`;

        if (!groups[sessionKey]) groups[sessionKey] = [];
        groups[sessionKey].push(order);
    });

    const result = Object.values(groups).map(group => {
        const total = group.reduce((sum, o) => sum + o.total, 0);
        group.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        const latestOrder = group[0];
        const regularOrder = group.find(o => o.orderType === 'regular');

        return {
            key: (latestOrder as any).sessionId || (latestOrder as any).session_id || `fallback-${latestOrder.id}`,
            orders: group,
            tableNumber: latestOrder.tableNumber,
            userName: latestOrder.userName,
            userPhone: latestOrder.userPhone,
            status: latestOrder.status,
            paymentStatus: latestOrder.paymentStatus,
            paymentMethod: (latestOrder as any).paymentMethod,
            total: total,
            latestId: latestOrder.id,
            sessionId: (latestOrder as any).sessionId || (latestOrder as any).session_id,
            regularOrder: regularOrder,
        };
    }).sort((a, b) => {
        return new Date(b.orders[0].date).getTime() - new Date(a.orders[0].date).getTime();
    });

    //console.log('Grouped into', result.length, 'sessions');
    /*result.forEach(g => {
      console.log(`Session ${g.key}: ${g.orders.length} orders, Table ${g.tableNumber}`);
      g.orders.forEach(o => {
        console.log(`  - Order ${o.id.slice(-4)}: ${o.orderType} | ${o.status}`);
      });
    });*/

    return result;
  }, [pastOrders]);

  const toggleExpand = (key: string) => {
      setExpandedSessions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleDelete = () => {
    if (orderToDelete) {
      console.log('Cancelling order:', orderToDelete.id, 'Type:', orderToDelete.orderType);
      cancelOrder(orderToDelete.id);
      setOrderToDelete(null);

      if (orderToDelete.orderType === 'addon') {
        toast({
          title: "Add-on Removed",
          description: "The add-on order has been removed from the session."
        });
      } else {
        toast({
          title: "Order Cancelled",
          description: "The order has been cancelled."
        });
      }
    }
  }

  if (pastOrders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">No active orders</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <AlertDialog open={!!orderToDelete} onOpenChange={(isOpen) => !isOpen && setOrderToDelete(null)}>
        <Card>
          <CardHeader>
            <CardTitle>Active Sessions ({groupedOrders.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Table</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Session Total</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {groupedOrders.map((group) => (
                  <React.Fragment key={group.key}>
                      {/* PARENT ROW */}
                      <TableRow className="bg-muted/20 hover:bg-muted/40">
                          <TableCell>
                              {group.orders.length > 1 && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-6 w-6 p-0" 
                                    onClick={() => toggleExpand(group.key)}
                                  >
                                      {expandedSessions[group.key] ? 
                                        <ChevronDown className="h-4 w-4"/> : 
                                        <ChevronRight className="h-4 w-4"/>
                                      }
                                  </Button>
                              )}
                          </TableCell>
                          <TableCell className="font-bold">Table {group.tableNumber}</TableCell>
                          <TableCell>
                              <div className="font-medium">{group.userName}</div>
                              <div className="text-xs text-muted-foreground">{group.userPhone}</div>
                          </TableCell>
                          <TableCell>
                              <Badge variant="outline" className="capitalize">
                                {group.status.toLowerCase()}
                              </Badge>
                          </TableCell>
                          <TableCell>
                              <div className="flex flex-col gap-1">
                                  <Badge 
                                    variant={group.paymentStatus === 'Approved' ? 'default' : 'secondary'} 
                                    className="w-fit"
                                  >
                                      {group.paymentStatus}
                                  </Badge>
                                  {group.paymentMethod && (
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase">
                                      {group.paymentMethod}
                                    </span>
                                  )}
                              </div>
                          </TableCell>
                          <TableCell className="text-right font-bold">₹{group.total.toFixed(2)}</TableCell>
                          <TableCell>
                              {(group.paymentStatus === 'Pending' || group.paymentStatus === 'Requested') &&
                              (group.status.toLowerCase() === 'ready' || group.status.toLowerCase() === 'served') && (
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={() => approvePayment(group.latestId)}
                                >
                                    Approve Payment
                                </Button>
                              )}
                          </TableCell>
                      </TableRow>

                      {/* CHILD ROWS */}
                      {expandedSessions[group.key] && group.orders.map(order => {
                        const orderStatus = order.status.toLowerCase();
                        const canCancel = orderStatus === 'pending' || orderStatus === 'confirmed';

                        console.log(`Render order ${order.id.slice(-4)}: status=${orderStatus}, canCancel=${canCancel}`);

                        return (
                          <TableRow 
                            key={order.id} 
                            className="bg-background text-muted-foreground text-sm"
                          >
                              <TableCell></TableCell>
                              <TableCell className="pl-10" colSpan={2}>
                                  {order.orderType === 'addon' ? (
                                    <Badge variant="secondary" className="mr-2 text-[10px]">
                                      Add-on
                                    </Badge>
                                  ) : (
                                    <Badge variant="default" className="mr-2 text-[10px]">
                                      Regular
                                    </Badge>
                                  )}
                                  #{order.orderNumber || order.id.slice(-4)}
                                  <Badge variant="outline" className="ml-2 capitalize text-[10px]">
                                    {orderStatus}
                                  </Badge>
                              </TableCell>
                              <TableCell colSpan={2}>
                                  {order.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
                              </TableCell>
                              <TableCell className="text-right">₹{order.total.toFixed(2)}</TableCell>
                              <TableCell>
                                  {canCancel ? (
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6 text-destructive hover:text-destructive hover:bg-destructive/10" 
                                        onClick={() => {
                                          console.log('Delete clicked for:', order.id);
                                          setOrderToDelete(order);
                                        }}
                                      >
                                          <Trash2 className="h-3 w-3" />
                                      </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      {orderStatus}
                                    </span>
                                  )}
                              </TableCell>
                          </TableRow>
                        );
                      })}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Order?</AlertDialogTitle>
              <AlertDialogDescription>
                {orderToDelete?.orderType === 'addon' ? (
                  <>
                    This will cancel the add-on order #{orderToDelete?.orderNumber || orderToDelete?.id.slice(-6)}. 
                    The main order and session will remain active.
                  </>
                ) : (
                  <>
                    This will cancel the regular order #{orderToDelete?.orderNumber || orderToDelete?.id.slice(-6)} 
                    and may close the session if no other orders exist.
                  </>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setOrderToDelete(null)}>Back</AlertDialogCancel>
              <AlertDialogAction 
                onClick={handleDelete} 
                className={cn(buttonVariants({variant: 'destructive'}))}
              >
                Cancel Order
              </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}