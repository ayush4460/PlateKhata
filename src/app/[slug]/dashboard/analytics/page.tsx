//app/slug/dashboard/analytics/page.tsx
"use client";

import { SalesChart } from "@/components/dashboard/sales-chart";
import { StatsCards } from "@/components/dashboard/stats-cards";
import { PaymentPieChart } from "@/components/dashboard/payment-pie-chart";
import { TopSellingItems } from "@/components/dashboard/top-selling-items";
import { OnlineSalesChart } from "@/components/dashboard/online-sales-chart"; // Imported
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Separator } from "@/components/ui/separator";

import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { useState } from "react";

export default function AnalyticsPage() {
  const {
    paymentStats,
    advancedAnalytics,
    analytics,
    advancedDateRange,
    setAdvancedDateRange,
  } = useCart();
  const { toast } = useToast();
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  // Generate PDF Blob
  const generatePDFBlob = async () => {
    const doc = new jsPDF();
    const title = `Sales Report (${
      advancedDateRange?.from
        ? format(advancedDateRange.from, "dd/MM/yyyy")
        : ""
    } - ${
      advancedDateRange?.to ? format(advancedDateRange.to, "dd/MM/yyyy") : ""
    })`;

    doc.setFontSize(20);
    doc.text("Sales Report", 14, 20);
    doc.setFontSize(12);
    doc.text(title, 14, 30);

    if (advancedAnalytics && analytics) {
      doc.text(`Total Revenue: Rs. ${analytics.totalRevenue}`, 14, 40);
      doc.text(`Total Orders: ${analytics.newOrders}`, 14, 48);

      // Payment Stats Table
      const payRows = paymentStats.map((p) => [
        p.name,
        p.count,
        `Rs. ${p.value.toFixed(2)}`,
      ]);
      autoTable(doc, {
        startY: 55,
        head: [["Payment Method", "Count", "Amount"]],
        body: payRows,
      });

      // Top Items Table
      const itemRows = advancedAnalytics.topSelling.map((i, idx) => [
        idx + 1,
        i.item_name,
        i.total_quantity,
        `Rs. ${Number(i.total_revenue).toFixed(2)}`,
      ]);
      autoTable(doc, {
        startY: (doc as any).lastAutoTable
          ? (doc as any).lastAutoTable.finalY + 10
          : 80,
        head: [["#", "Item Name", "Qty Sold", "Revenue"]],
        body: itemRows,
      });
    }

    return doc.output("blob");
  };

  const handleDownloadPDF = async () => {
    const blob = await generatePDFBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Sales_Report_${new Date().getTime()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendToCA = async () => {
    if (!advancedAnalytics) return;
    setIsSendingEmail(true);
    try {
      const blob = await generatePDFBlob();
      const formData = new FormData();
      formData.append("file", blob, `Sales_Report.pdf`);
      formData.append("reportType", "sales");
      const dateRangeStr = advancedDateRange?.from
        ? `${format(advancedDateRange.from, "dd/MM/yyyy")} - ${
            advancedDateRange.to
              ? format(advancedDateRange.to, "dd/MM/yyyy")
              : ""
          }`
        : "All Time";
      formData.append("dateRange", dateRangeStr);

      const token = localStorage.getItem("accessToken");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/email/send-report`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to send email");
      }

      toast({ title: "Email Sent", description: "Sales report sent to CA." });
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send report.",
      });
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 pt-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your revenue, orders, and sales performance.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-background p-1 rounded-lg border shadow-sm">
          <DatePickerWithRange
            className="w-full md:w-[300px]"
            date={advancedDateRange}
            setDate={setAdvancedDateRange}
          />

          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPDF}
            title="Download PDF"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={handleSendToCA}
            disabled={isSendingEmail}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {isSendingEmail ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            Send to CA
          </Button>
        </div>
      </div>

      <Separator className="bg-border/50" />

      {/* Key Metrics Row */}
      <div className="animate-in fade-in-50 slide-in-from-bottom-5 duration-500">
        <StatsCards />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6 animate-in fade-in-50 slide-in-from-bottom-5 duration-700 delay-100">
        {/* Main Sales Chart - Dominant View */}
        <div className="lg:col-span-5 h-full">
          <SalesChart />
        </div>

        {/* Payment Methods - Sidebar View */}
        <div className="lg:col-span-2 h-full">
          <PaymentPieChart data={paymentStats} />
        </div>
      </div>

      {/* Online Sales Overview */}
      <div className="animate-in fade-in-50 slide-in-from-bottom-5 duration-1000 delay-150">
        <OnlineSalesChart />
      </div>

      {/* Top Selling Items - Full Width Detail */}
      <div className="animate-in fade-in-50 slide-in-from-bottom-5 duration-1000 delay-200">
        {advancedAnalytics && (
          <TopSellingItems data={advancedAnalytics.topSelling} />
        )}
      </div>
    </div>
  );
}
