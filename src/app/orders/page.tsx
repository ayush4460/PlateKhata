// src/app/orders/page.tsx
'use client';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/hooks/use-cart';
import { cn } from '@/lib/utils';
import { Download } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { PastOrder } from '@/lib/types';
import type { UserOptions } from 'jspdf-autotable';
import Link from 'next/link';

interface jsPDFWithAutoTable extends jsPDF { autoTable: (options: UserOptions) => jsPDF; }

export default function OrdersPage() {
  const { pastOrders, isCartLoading, tableNumber } = useCart();
  const [isClient, setIsClient] = useState(false);

  useEffect(() => { setIsClient(true); }, []);

  // --- useMemo Logic to find the current active order for THIS table ---
  const activeOrderForTable = useMemo(() => {
    // --- DEBUG LOG ---
    console.log('[DEBUG OrdersPage UseMemo] Input pastOrders:', pastOrders, 'tableNumber:', tableNumber);
    // --- END DEBUG LOG ---

    // Guards: Need tableNumber and pastOrders must be an array
    if (!tableNumber || !Array.isArray(pastOrders)) {
        console.log('[DEBUG OrdersPage UseMemo] No table number or pastOrders not an array, returning null.');
        return null;
    }

    // Filter orders for the current table AND non-finished statuses
    const relevantOrders = pastOrders.filter(order =>
        order.tableNumber === tableNumber &&
        order.status !== 'completed' && // Use backend status string
        order.status !== 'cancelled'   // Use backend status string
    );
    console.log('[DEBUG OrdersPage UseMemo] Relevant Orders found:', relevantOrders.length);

    if (relevantOrders.length === 0) {
        console.log('[DEBUG OrdersPage UseMemo] No relevant orders found after filtering, returning null.');
        return null; // No active order found
    }

    // Sort by date descending to get the most recent one first
    const sortedOrders = relevantOrders.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    console.log('[DEBUG OrdersPage UseMemo] Most recent active order:', sortedOrders[0]);
    return sortedOrders[0]; // Return the latest active order

  }, [pastOrders, tableNumber]); // Recalculate when orders or table number change
  // --- END useMemo Logic ---

  // --- DEBUG LOG: Log the calculated active order whenever it changes ---
  useEffect(() => {
      console.log('[DEBUG OrdersPage Effect] Calculated activeOrderForTable:', activeOrderForTable);
  }, [activeOrderForTable]);
  // --- END DEBUG LOG ---

  // --- Function to generate PDF receipt ---
  const handleDownloadReceipt = (order: PastOrder) => {
      const doc = new jsPDF() as jsPDFWithAutoTable;
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFontSize(22); doc.setFont('helvetica', 'bold');
      doc.text('MunchMate', pageWidth / 2, 22, { align: 'center' });
      doc.setFontSize(12); doc.setFont('helvetica', 'normal');
      doc.text(`Order #${order.id.slice(-6)} | ${new Date(order.date).toLocaleString()}`, pageWidth / 2, 30, { align: 'center' });

      // Customer Info
      doc.setFontSize(14); doc.setFont('helvetica', 'bold');
      doc.text('Billed To:', 14, 50);
      doc.setFontSize(12); doc.setFont('helvetica', 'normal');
      doc.text(order.userName, 14, 58);
      doc.text(`Phone: ${order.userPhone}`, 14, 64);
      doc.text(`Table: ${order.tableNumber}`, 14, 70);

      // Order Summary Table
      const tableColumn = ["Item", "Quantity", "Price", "Total"];
      const tableRows = order.items.map(item => [ item.name, item.quantity, `₹${item.price.toFixed(2)}`, `₹${(item.price * item.quantity).toFixed(2)}` ]);

      doc.autoTable({ startY: 80, head: [tableColumn], body: tableRows, theme: 'striped', headStyles: { fillColor: [34, 139, 34] }, styles: { font: 'helvetica', cellPadding: 3 }, });

      // Total and Payment Status
      const finalY = (doc as any).lastAutoTable.finalY || 120; // Get Y position after table
      doc.setFontSize(12); doc.setFont('helvetica', 'bold');
      doc.text('Total Amount:', 14, finalY + 15);
      doc.text(`₹${order.total.toFixed(2)}`, pageWidth - 14, finalY + 15, { align: 'right' });
      doc.text('Payment Status:', 14, finalY + 23);
      // Set text color based on payment status
      doc.setTextColor(order.paymentStatus === 'Approved' ? [0, 128, 0] : [255, 0, 0]); // Green or Red
      doc.text(order.paymentStatus, pageWidth - 14, finalY + 23, { align: 'right' });
      doc.setTextColor(0, 0, 0); // Reset text color
      doc.setFont('helvetica', 'normal');

      // Thank you note
      doc.setFontSize(14); doc.setFont('helvetica', 'italic');
      doc.text('Thank you for dining with us!', pageWidth / 2, finalY + 45, { align: 'center' });

      // Save the PDF
      doc.save(`receipt-ORD-${order.id.slice(-6)}.pdf`);
   };
  // --- END Function to generate PDF receipt ---

  // Loading state
  if (!isClient || isCartLoading) {
    return <div className="flex items-center justify-center h-screen bg-background"><p>Loading...</p></div>;
  }

  // --- Main Return JSX ---
  return (
    <div className="bg-background min-h-screen pb-24">
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 p-4 border-b">
        <h1 className="text-2xl font-bold text-center">My Order Status</h1>
      </header>

      <main className="p-4 space-y-4">
        {/* Case 1: No table number scanned yet */}
        {!tableNumber ? (
           <div className="text-center py-20">
             <p className="text-muted-foreground mb-4">Please scan a table's QR code to see your order status.</p>
             <Button asChild><Link href="/">Go to Menu</Link></Button>
           </div>
        /* Case 2: Table scanned, but no active order found for it */
        ) : !activeOrderForTable ? (
           <div className="text-center py-20">
             <p className="text-muted-foreground">No active order found for this table.</p>
             {/* Link back to the menu FOR THIS TABLE */}
             <Button asChild><Link href={`/?table=${tableNumber}`}>Go back to Menu</Link></Button>
           </div>
        /* Case 3: Active order found for the current table */
        ) : (
          <Card key={activeOrderForTable.id}>
            <CardHeader>
              <CardTitle className="flex justify-between items-start text-lg">
                {/* Order ID and Details */}
                <div>
                    <span>Order #{activeOrderForTable.id.slice(-4)}</span>
                     <div className="text-sm text-muted-foreground mt-1">
                        {new Date(activeOrderForTable.date).toLocaleDateString()} &bull; ₹{activeOrderForTable.total.toFixed(2)}
                     </div>
                </div>
                {/* Status Badges */}
                <div className="flex flex-col items-end gap-2">
                    {/* Order Status Badge */}
                    <Badge
                        variant="outline"
                        className={cn(
                        'capitalize',
                        // Match backend status strings exactly for coloring
                        (activeOrderForTable.status === 'completed' || activeOrderForTable.status === 'served') && 'bg-green-100 text-green-800 border-green-200',
                        (activeOrderForTable.status === 'preparing' || activeOrderForTable.status === 'ready') && 'bg-blue-100 text-blue-800 border-blue-200',
                        (activeOrderForTable.status === 'pending' || activeOrderForTable.status === 'confirmed') && 'bg-yellow-100 text-yellow-800 border-yellow-200',
                        activeOrderForTable.status === 'cancelled' && 'bg-red-100 text-red-800 border-red-200'
                        )}
                    >
                        {activeOrderForTable.status}
                    </Badge>
                     {/* Payment Status Badge */}
                     <Badge
                        variant={activeOrderForTable.paymentStatus === 'Approved' ? 'default' : 'secondary'}
                        className={cn(
                        'text-xs capitalize',
                        activeOrderForTable.paymentStatus === 'Approved' && 'bg-green-100 text-green-800 border-green-200',
                        activeOrderForTable.paymentStatus === 'Pending' && 'bg-orange-100 text-orange-800 border-orange-200'
                        )}
                    >
                       Payment: {activeOrderForTable.paymentStatus}
                    </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Separator className="my-4" />
              {/* List of items in the order */}
              <div className="space-y-2">
                {activeOrderForTable.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.name} (x{item.quantity})</span>
                    <span className="text-muted-foreground">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              {/* Download Receipt Button (Only if payment approved) */}
              {activeOrderForTable.paymentStatus === 'Approved' && (
                <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => handleDownloadReceipt(activeOrderForTable)}>
                        <Download className="mr-2 h-4 w-4" /> Download Receipt
                    </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>

      {/* Bottom Navigation Bar */}
      <BottomNav />
    </div>
  );
}