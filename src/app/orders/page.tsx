// src/app/orders/page.tsx
'use client';

import { BottomNav } from '@/components/layout/bottom-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/use-cart';
import { cn } from '@/lib/utils';
import { Download, PlusCircle, CreditCard } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { PastOrder } from '@/lib/types';
import type { UserOptions } from 'jspdf-autotable';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PaymentModal } from '@/components/payment/payment-modal';

interface jsPDFWithAutoTable extends jsPDF { autoTable: (options: UserOptions) => jsPDF; }

export default function OrdersPage() {
  const { pastOrders, isCartLoading, tableNumber } = useCart();
  const [isClient, setIsClient] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const router = useRouter();

  useEffect(() => { setIsClient(true); }, []);

  const tableSessionOrders = useMemo(() => {
    if (!tableNumber || !Array.isArray(pastOrders)) return [];
    // Filter active orders
    const sessionOrders = pastOrders.filter(order => 
        order.tableNumber === tableNumber && 
        order.status !== 'Cancelled'
    );
    return sessionOrders.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [pastOrders, tableNumber]);

  // Calculate Grand Totals
  const sessionTotals = useMemo(() => {
      return tableSessionOrders.reduce((acc, order) => ({
          subtotal: acc.subtotal + (order.subtotal || 0),
          tax: acc.tax + (order.tax || 0),
          discount: acc.discount + (order.discount || 0),
          total: acc.total + order.total
      }), { subtotal: 0, tax: 0, discount: 0, total: 0 });
  }, [tableSessionOrders]);

  const isPaymentPending = tableSessionOrders.some(o => o.paymentStatus === 'Pending');
  const isFullyPaid = tableSessionOrders.length > 0 && tableSessionOrders.every(o => o.paymentStatus === 'Approved');

  // --- CONSOLIDATED RECEIPT GENERATOR ---
  const handleDownloadCombinedReceipt = () => {
      const doc = new jsPDF() as jsPDFWithAutoTable;
      const pageWidth = doc.internal.pageSize.getWidth();
      const firstOrder = tableSessionOrders[0];

      // Header
      doc.setFontSize(20);
      doc.setFont('helvetica', 'bold');
      doc.text('MunchMate', pageWidth / 2, 20, { align: 'center' });

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Delicious Food, Delivered to Table', pageWidth / 2, 26, { align: 'center' });

      doc.setLineWidth(0.5);
      doc.line(10, 32, pageWidth - 10, 32);

      // Customer Details
      doc.setFontSize(11);
      doc.text(`Customer: ${firstOrder.userName}`, 14, 42);
      doc.text(`Phone: ${firstOrder.userPhone}`, 14, 48);
      doc.text(`Table: ${tableNumber}`, pageWidth - 14, 42, { align: 'right' });
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageWidth - 14, 48, { align: 'right' });

      // Consolidate Items
      // Merge duplicates if same item ordered multiple times
      const consolidatedItems: Record<string, {name: string, qty: number, price: number, total: number}> = {};

      tableSessionOrders.forEach(order => {
          order.items.forEach(item => {
              if (consolidatedItems[item.name]) {
                  consolidatedItems[item.name].qty += item.quantity;
                  consolidatedItems[item.name].total += (item.price * item.quantity);
              } else {
                  consolidatedItems[item.name] = {
                      name: item.name,
                      qty: item.quantity,
                      price: item.price,
                      total: item.price * item.quantity
                  };
              }
          });
      });

      const tableRows = Object.values(consolidatedItems).map(item => [
          item.name,
          item.qty.toString(),
          `₹${item.price.toFixed(2)}`,
          `₹${item.total.toFixed(2)}`
      ]);

      // Items Table
      doc.autoTable({
          startY: 55,
          head: [['Item', 'Qty', 'Price', 'Total']],
          body: tableRows,
          theme: 'grid',
          headStyles: { fillColor: [20, 20, 20], textColor: [255, 255, 255] },
          styles: { fontSize: 10, cellPadding: 3 },
      });

      // Financials
      const finalY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(10);
      doc.text(`Subtotal:`, 140, finalY);
      doc.text(`₹${sessionTotals.subtotal.toFixed(2)}`, pageWidth - 14, finalY, { align: 'right' });

      doc.text(`Tax:`, 140, finalY + 6);
      doc.text(`₹${sessionTotals.tax.toFixed(2)}`, pageWidth - 14, finalY + 6, { align: 'right' });

      if (sessionTotals.discount > 0) {
          doc.setTextColor(0, 150, 0);
          doc.text(`Discount:`, 140, finalY + 12);
          doc.text(`-₹${sessionTotals.discount.toFixed(2)}`, pageWidth - 14, finalY + 12, { align: 'right' });
          doc.setTextColor(0, 0, 0);
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      const totalY = sessionTotals.discount > 0 ? finalY + 20 : finalY + 14;
      doc.text(`Grand Total:`, 140, totalY);
      doc.text(`₹${sessionTotals.total.toFixed(2)}`, pageWidth - 14, totalY, { align: 'right' });

      // Footer
      doc.setFontSize(10);
      doc.setFont('helvetica', 'italic');
      doc.text("Thank you for dining with us!", pageWidth / 2, totalY + 20, { align: 'center' });

      doc.save(`Invoice-Table-${tableNumber}.pdf`);
  };

  const handleAddMoreItems = () => { router.push(`/?table=${tableNumber}`); };
  const handleMakePayment = () => { setIsPaymentModalOpen(true); };

  if (!isClient || isCartLoading) return <div className="flex h-screen items-center justify-center"><p>Loading...</p></div>;

  return (
    <div className="bg-background min-h-screen pb-32">
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 p-4 border-b">
        <h1 className="text-2xl font-bold text-center">Table {tableNumber} - My Orders</h1>
      </header>

      <main className="p-4 space-y-6">
        {!tableNumber ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">Please scan a table's QR code.</p>
            <Button asChild><Link href="/">Go to Menu</Link></Button>
          </div>
        ) : tableSessionOrders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No active orders found.</p>
            <Button asChild className="mt-4"><Link href={`/?table=${tableNumber}`}>Start Ordering</Link></Button>
          </div>
        ) : (
          <>
            {tableSessionOrders.map((order, index) => (
              <Card key={order.id} className={cn("border-l-4", order.orderType === 'addon' ? "border-l-orange-500" : "border-l-primary")}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-start text-base">
                    <div className="flex flex-col">
                        <span className="flex items-center gap-2">
                            {order.orderType === 'addon' ? 'Add-on' : 'Order'} 
                            <span className="text-xs font-normal text-muted-foreground">#{order.orderNumber || order.id.slice(-4)}</span>
                        </span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <Badge variant="outline" className="capitalize">{order.status}</Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>{item.quantity}x {item.name}</span>
                        <span className="text-muted-foreground">₹{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* --- GRAND TOTAL & RECEIPT --- */}
            <Card className="bg-muted/30 border-2 border-primary/20">
                <CardContent className="p-4 space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground"><span>Subtotal</span><span>₹{sessionTotals.subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-sm text-muted-foreground"><span>Tax</span><span>₹{sessionTotals.tax.toFixed(2)}</span></div>
                    {sessionTotals.discount > 0 && (
                        <div className="flex justify-between text-sm text-green-600"><span>Discount</span><span>-₹{sessionTotals.discount.toFixed(2)}</span></div>
                    )}
                    <Separator />
                    <div className="flex justify-between items-center text-xl font-bold pt-2">
                        <span>Total</span>
                        <span>₹{sessionTotals.total.toFixed(2)}</span>
                    </div>
                    {/* SHOW RECEIPT ONLY IF FULLY PAID */}
                    {isFullyPaid && (
                        <Button className="w-full mt-4 gap-2" onClick={handleDownloadCombinedReceipt}>
                            <Download className="h-4 w-4" /> Download Final Receipt
                        </Button>
                    )}
                </CardContent>
            </Card>
          </>
        )}
      </main>

      {tableNumber && tableSessionOrders.length > 0 && isPaymentPending && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex gap-3 z-20 pb-8 md:pb-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <Button variant="outline" className="flex-1 gap-2 h-12" onClick={handleAddMoreItems}>
                <PlusCircle className="h-5 w-5" /> Add Items
            </Button>
            <Button className="flex-1 gap-2 h-12" onClick={handleMakePayment}>
                <CreditCard className="h-5 w-5" /> Make Payment
            </Button>
        </div>
      )}

      {tableNumber && tableSessionOrders.length > 0 && (
          <PaymentModal
            isOpen={isPaymentModalOpen}
            onClose={() => setIsPaymentModalOpen(false)}
            orderId={tableSessionOrders[0].id}
            amount={sessionTotals.total}
          />
      )}

      {!isPaymentPending && <BottomNav />}
    </div>
  );
}