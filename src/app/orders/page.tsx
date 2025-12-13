// src/app/orders/page.tsx
"use client";

import { BottomNav } from "@/components/layout/bottom-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/hooks/use-cart";
import { cn } from "@/lib/utils";
import { Download, PlusCircle, CreditCard, FileText } from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import type { PastOrder } from "@/lib/types";
import type { UserOptions } from "jspdf-autotable";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PaymentModal } from "@/components/payment/payment-modal";

interface jsPDFWithAutoTable extends jsPDF {
  autoTable: (options: UserOptions) => jsPDF;
}

// Grace period
const RECEIPT_GRACE_PERIOD = 30 * 60 * 1000;

export default function OrdersPage() {
  const { pastOrders, isCartLoading, tableNumber, tableId } = useCart();
  const [isClient, setIsClient] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const router = useRouter();

  // DEBUG: Log what we receive from useCart
  useEffect(() => {
    /*console.log('[ORDERS PAGE] useCart data:', {
      pastOrders: pastOrders?.length || 0,
      isCartLoading,
      tableNumber,
      pastOrdersSample: pastOrders?.[0]
    });*/
  }, [pastOrders, isCartLoading, tableNumber]);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Update current time every minute to refresh the grace period check
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 120000);

    return () => clearInterval(interval);
  }, []);

  const tableSessionOrders = useMemo(() => {
    if (!tableNumber || !Array.isArray(pastOrders)) {
      //console.log('[ORDERS PAGE DEBUG] Missing tableNumber or pastOrders not array');
      return { active: [], completed: [] };
    }

    const now = Date.now();
    const active: PastOrder[] = [];
    const completed: PastOrder[] = [];

    pastOrders.forEach((order, index) => {
      // Check for match against either tableNumber OR tableId
      const matchesTable =
        String(order.tableNumber) === String(tableNumber) ||
        (tableId && String(order.tableNumber) === String(tableId));

      if (!matchesTable) {
        //console.log(`[ORDERS PAGE DEBUG] Order ${order.id} - table mismatch, skipping. OrderTable=${order.tableNumber}, CurrentTable=${tableNumber}, TableId=${tableId}`);
        return;
      }

      const statusLower = String(order.status || "").toLowerCase();

      if (statusLower === "cancelled") {
        //console.log(`[ORDERS PAGE DEBUG] Order ${order.id} - cancelled, skipping`);
        return;
      }

      const isCompleted =
        statusLower === "completed" && order.paymentStatus === "Approved";

      //console.log(`[ORDERS PAGE DEBUG] Order ${order.id} - statusLower: ${statusLower}, isCompleted: ${isCompleted}`);

      if (isCompleted) {
        const orderUpdateTime = (order as any).updatedAt || order.date;
        const orderCompletedTime = new Date(orderUpdateTime).getTime();
        const timeSinceCompletion = now - orderCompletedTime;

        // Show completed orders only if within grace period
        if (timeSinceCompletion < RECEIPT_GRACE_PERIOD) {
          completed.push(order);
          //console.log(`[ORDERS PAGE DEBUG] Order ${order.id} - Added to completed`);
        } else {
          //console.log(`[ORDERS PAGE DEBUG] Order ${order.id} - Outside grace period, not showing`);
        }
      } else {
        active.push(order);
        //console.log(`[ORDERS PAGE DEBUG] Order ${order.id} - Added to active`);
      }
    });

    return {
      active: active.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
      completed: completed.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      ),
    };
  }, [pastOrders, tableNumber, tableId, currentTime]);

  const allDisplayedOrders = [
    ...tableSessionOrders.active,
    ...tableSessionOrders.completed,
  ];

  // Calculate Grand Totals
  const sessionTotals = useMemo(() => {
    return allDisplayedOrders.reduce(
      (acc, order) => ({
        subtotal: acc.subtotal + (order.subtotal || 0),
        tax: acc.tax + (order.tax || 0),
        discount: acc.discount + (order.discount || 0),
        total: acc.total + order.total,
      }),
      { subtotal: 0, tax: 0, discount: 0, total: 0 }
    );
  }, [allDisplayedOrders]);

  const isPaymentPending = tableSessionOrders.active.some(
    (o) => o.paymentStatus === "Pending"
  );
  const isFullyPaid =
    allDisplayedOrders.length > 0 &&
    allDisplayedOrders.every((o) => o.paymentStatus === "Approved");
  const hasCompletedOrders = tableSessionOrders.completed.length > 0;

  // Calculate remaining time for receipt availability
  const getReceiptTimeRemaining = () => {
    if (tableSessionOrders.completed.length === 0) return null;

    const oldestCompleted = tableSessionOrders.completed[0];
    const completedTime = new Date(oldestCompleted.date).getTime();
    const elapsed = Date.now() - completedTime;
    const remaining = RECEIPT_GRACE_PERIOD - elapsed;

    if (remaining <= 0) return null;

    const minutes = Math.floor(remaining / 60000);
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  };

  // --- MODERN RECEIPT GENERATOR ---

  const handleDownloadCombinedReceipt = () => {
    const doc = new jsPDF() as jsPDFWithAutoTable;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const firstOrder = allDisplayedOrders[0];

    // Modern gradient header with soft pink
    doc.setFillColor(255, 228, 230);
    doc.rect(0, 0, pageWidth, 55, "F");

    // Restaurant name with elegant styling
    doc.setFontSize(32);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(236, 72, 153); // Pink
    doc.text("Axios", pageWidth / 2, 25, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(134, 25, 143); // Deep pink
    doc.text("Where Every Meal is a Celebration", pageWidth / 2, 35, {
      align: "center",
    });

    // Contact info
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(115, 115, 115);
    doc.text(
      "Phone: +91-XXXX-XXXXXX | Email: hello@axios.com",
      pageWidth / 2,
      43,
      { align: "center" }
    );

    // Receipt title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 197, 94); // Green
    doc.text("TAX INVOICE", pageWidth / 2, 68, { align: "center" });

    // Info section with cream background
    doc.setFillColor(254, 252, 232); // Cream
    doc.roundedRect(14, 75, pageWidth - 28, 32, 3, 3, "F");

    // Border for info box
    doc.setDrawColor(134, 239, 172); // Light green
    doc.setLineWidth(0.5);
    doc.roundedRect(14, 75, pageWidth - 28, 32, 3, 3, "S");

    // Customer details column
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(236, 72, 153); // Pink
    doc.text("CUSTOMER", 18, 82);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(64, 64, 64);
    doc.setFontSize(9);
    doc.text(firstOrder.userName, 18, 88);
    doc.text(firstOrder.userPhone, 18, 93);
    doc.text(`Table ${tableNumber}`, 18, 98);

    // Order details column
    doc.setFont("helvetica", "bold");
    doc.setTextColor(34, 197, 94); // Green
    doc.setFontSize(9);
    doc.text("ORDER DETAILS", pageWidth / 2 + 5, 82);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(64, 64, 64);
    doc.text(
      `Invoice: ${firstOrder.orderNumber || firstOrder.id.slice(-6)}`,
      pageWidth / 2 + 5,
      88
    );
    doc.text(
      `Date: ${new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}`,
      pageWidth / 2 + 5,
      93
    );
    doc.text(
      `Time: ${new Date().toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })}`,
      pageWidth / 2 + 5,
      98
    );

    // Consolidate Items
    const consolidatedItems: Record<
      string,
      { name: string; qty: number; price: number; total: number }
    > = {};

    allDisplayedOrders.forEach((order) => {
      order.items.forEach((item) => {
        if (consolidatedItems[item.name]) {
          consolidatedItems[item.name].qty += item.quantity;
          consolidatedItems[item.name].total += item.price * item.quantity;
        } else {
          consolidatedItems[item.name] = {
            name: item.name,
            qty: item.quantity,
            price: item.price,
            total: item.price * item.quantity,
          };
        }
      });
    });

    // Format currency properly (FIX FOR ENCODING ISSUE)
    const formatCurrency = (amount: number): string => {
      return `Rs ${amount.toFixed(2)}`; // Use "Rs" instead of ₹ symbol
    };

    const tableRows = Object.values(consolidatedItems).map((item) => [
      item.name,
      item.qty.toString(),
      formatCurrency(item.price),
      formatCurrency(item.total),
    ]);

    // Modern table with green/pink theme
    doc.autoTable({
      startY: 115,
      head: [["Item Description", "Qty", "Rate", "Amount"]],
      body: tableRows,
      theme: "plain",
      headStyles: {
        fillColor: [134, 239, 172], // Light green
        textColor: [22, 101, 52], // Dark green text
        fontSize: 10,
        fontStyle: "bold",
        cellPadding: 5,
      },
      bodyStyles: {
        fontSize: 9,
        cellPadding: 4,
        textColor: [64, 64, 64],
      },
      alternateRowStyles: {
        fillColor: [254, 252, 232], // Cream
      },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 25, halign: "center" },
        2: { cellWidth: 35, halign: "right" },
        3: { cellWidth: 40, halign: "right", fontStyle: "bold" },
      },
      margin: { left: 14, right: 14 },
    });

    // Financial summary
    const finalY = (doc as any).lastAutoTable.finalY + 15;

    // Summary box with gradient effect
    const summaryBoxY = finalY;
    const summaryBoxHeight = sessionTotals.discount > 0 ? 50 : 43;

    // Gradient background (cream to light pink)
    doc.setFillColor(254, 252, 232); // Cream
    doc.roundedRect(
      pageWidth - 95,
      summaryBoxY,
      81,
      summaryBoxHeight,
      3,
      3,
      "F"
    );

    doc.setDrawColor(236, 72, 153); // Pink border
    doc.setLineWidth(0.8);
    doc.roundedRect(
      pageWidth - 95,
      summaryBoxY,
      81,
      summaryBoxHeight,
      3,
      3,
      "S"
    );

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    let yPos = summaryBoxY + 8;

    if (sessionTotals.discount > 0 || sessionTotals.tax < 0) {
      doc.text("Subtotal:", pageWidth - 90, yPos);
      doc.text(formatCurrency(sessionTotals.subtotal), pageWidth - 18, yPos, {
        align: "right",
      });

      yPos += 7;
      doc.text("Tax:", pageWidth - 90, yPos);
      doc.text(formatCurrency(sessionTotals.tax), pageWidth - 18, yPos, {
        align: "right",
      });

      yPos += 7;
      doc.setTextColor(220, 38, 38); // Red for discount
      doc.text("Discount:", pageWidth - 90, yPos);
      doc.text(
        `-${formatCurrency(sessionTotals.discount)}`,
        pageWidth - 18,
        yPos,
        { align: "right" }
      );
      doc.setTextColor(80, 80, 80);

      // Decorative line
      yPos += 9;
      doc.setDrawColor(134, 239, 172); // Green
      doc.setLineWidth(1.5);
      doc.line(pageWidth - 93, yPos - 2, pageWidth - 16, yPos - 2);
    }

    // Grand Total with emphasis
    yPos += 6;
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(236, 72, 153); // Pink
    doc.text("Grand Total:", pageWidth - 90, yPos);
    doc.setTextColor(34, 197, 94); // Green
    doc.setFontSize(14);
    doc.text(formatCurrency(sessionTotals.total), pageWidth - 18, yPos, {
      align: "right",
    });

    // Payment status badge
    if (isFullyPaid) {
      const badgeY = yPos + 10;
      doc.setFillColor(134, 239, 172); // Light green
      doc.roundedRect(pageWidth - 75, badgeY, 61, 9, 2, 2, "F");

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(22, 101, 52); // Dark green
      doc.text("PAID IN FULL", pageWidth - 44.5, badgeY + 6, {
        align: "center",
      });
    }

    // Order count badge (if multiple orders)
    if (allDisplayedOrders.length > 1) {
      const orderCountY = summaryBoxY - 8;
      doc.setFillColor(252, 231, 243); // Light pink
      doc.roundedRect(pageWidth - 95, orderCountY, 81, 7, 2, 2, "F");

      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(236, 72, 153); // Pink
      doc.text(
        `${allDisplayedOrders.length} orders combined`,
        pageWidth - 54.5,
        orderCountY + 4.5,
        { align: "center" }
      );
    }

    // Footer section
    const footerY = pageHeight - 35;

    // Decorative footer wave (using rectangles)
    doc.setFillColor(254, 252, 232); // Cream
    doc.rect(0, footerY - 10, pageWidth, 10, "F");
    doc.setFillColor(255, 228, 230); // Light pink
    doc.rect(0, footerY, pageWidth, 45, "F");

    // Thank you message with icons (using text)
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(236, 72, 153); // Pink
    doc.text("Thank You!", pageWidth / 2, footerY + 10, { align: "center" });

    doc.setFontSize(10);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(134, 25, 143); // Deep pink
    doc.text("We hope to serve you again soon", pageWidth / 2, footerY + 17, {
      align: "center",
    });

    // Social media / contact
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(115, 115, 115);
    doc.text("Follow us: @Axios | www.Axios.com", pageWidth / 2, footerY + 25, {
      align: "center",
    });

    // Small print
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text(
      "This is a computer generated invoice. No signature required.",
      pageWidth / 2,
      footerY + 31,
      { align: "center" }
    );

    // Save with proper filename
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `Axios-Invoice-Table${tableNumber}-${timestamp}.pdf`;
    doc.save(filename);
  };

  const handleAddMoreItems = () => {
    router.push(`/?table=${tableNumber}`);
  };
  const handleMakePayment = () => {
    setIsPaymentModalOpen(true);
  };

  if (!isClient || isCartLoading)
    return (
      <div className="flex h-screen items-center justify-center">
        <p>Loading...</p>
      </div>
    );

  const timeRemaining = getReceiptTimeRemaining();

  return (
    <div className="bg-background min-h-screen pb-32">
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 p-4 border-b">
        <h1 className="text-2xl font-bold text-center">
          Table {tableNumber} - My Orders
        </h1>
      </header>

      <main className="p-4 space-y-6">
        {!tableNumber ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">
              Please scan a table's QR code.
            </p>
            <Button asChild>
              <Link href="/">Go to Menu</Link>
            </Button>
          </div>
        ) : allDisplayedOrders.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No active orders found.</p>
            <Button asChild className="mt-4">
              <Link href={`/?table=${tableNumber}`}>Start Ordering</Link>
            </Button>
          </div>
        ) : (
          <>
            {/* Active Orders */}
            {tableSessionOrders.active.map((order) => (
              <Card
                key={order.id}
                className={cn(
                  "border-l-4",
                  order.orderType === "addon"
                    ? "border-l-orange-500"
                    : "border-l-primary"
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-start text-base">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-2">
                        {order.orderType === "addon" ? "Add-on" : "Order"}
                        <span className="text-xs font-normal text-muted-foreground">
                          #{order.orderNumber || order.id.slice(-4)}
                        </span>
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="outline" className="capitalize">
                        {order.status}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-muted-foreground">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Completed Orders (within grace period) */}
            {tableSessionOrders.completed.map((order) => (
              <Card
                key={order.id}
                className="border-l-4 border-l-green-500 bg-green-50/50 dark:bg-green-950/20"
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex justify-between items-start text-base">
                    <div className="flex flex-col">
                      <span className="flex items-center gap-2">
                        {order.orderType === "addon" ? "Add-on" : "Order"}
                        <span className="text-xs font-normal text-muted-foreground">
                          #{order.orderNumber || order.id.slice(-4)}
                        </span>
                      </span>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <Badge variant="default" className="bg-green-600">
                        Completed
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {order.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                        <span className="text-muted-foreground">
                          ₹{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* GRAND TOTAL & RECEIPT */}
            <Card className="bg-muted/30 border-2 border-primary/20">
              <CardContent className="p-4 space-y-2">
                {sessionTotals.tax > 0 ||
                  (sessionTotals.discount > 0 && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>Subtotal</span>
                      <span>₹{sessionTotals.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                {sessionTotals.tax > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>Tax</span>
                    <span>₹{sessionTotals.tax.toFixed(2)}</span>
                  </div>
                )}
                {sessionTotals.discount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Discount</span>
                    <span>-₹{sessionTotals.discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-xl font-bold pt-2">
                  <span>Total</span>
                  <span>₹{sessionTotals.total.toFixed(2)}</span>
                </div>

                {/* RECEIPT BUTTON - Show if any completed orders exist (within grace period) */}
                {hasCompletedOrders && (
                  <div className="space-y-2 pt-2">
                    <Button
                      className="w-full gap-2"
                      onClick={handleDownloadCombinedReceipt}
                      variant="default"
                    >
                      <FileText className="h-4 w-4" /> Download Receipt
                    </Button>
                    {timeRemaining && (
                      <p className="text-xs text-center text-muted-foreground">
                        Receipt available for {timeRemaining}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {tableNumber &&
        tableSessionOrders.active.length > 0 &&
        isPaymentPending && (
          <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t flex gap-3 z-20 pb-8 md:pb-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
            <Button
              variant="outline"
              className="flex-1 gap-2 h-12"
              onClick={handleAddMoreItems}
            >
              <PlusCircle className="h-5 w-5" /> Add Items
            </Button>
            <Button className="flex-1 gap-2 h-12" onClick={handleMakePayment}>
              <CreditCard className="h-5 w-5" /> Make Payment
            </Button>
          </div>
        )}

      {tableNumber && tableSessionOrders.active.length > 0 && (
        <PaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          orderId={tableSessionOrders.active[0].id}
          amount={sessionTotals.total}
        />
      )}

      {!isPaymentPending && <BottomNav />}
    </div>
  );
}
