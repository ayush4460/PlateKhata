// src/components/payment/payment-modal.tsx
"use client";

import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { QRCodeCanvas } from "qrcode.react";
import { Banknote, Smartphone, ArrowRight } from "lucide-react";
import { useCart } from "@/hooks/use-cart";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  amount: number;
}

export function PaymentModal({
  isOpen,
  onClose,
  orderId,
  amount,
}: PaymentModalProps) {
  const { requestPayment, upiId } = useCart();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- UPI CONFIG ---
  const MERCHANT_NAME = "PlateKhata";

  // Generate UPI String
  const { canUseUpi, upiString } = useMemo(() => {
    const trimmed = (upiId || "").trim();
    if (!trimmed) {
      return { canUseUpi: false, upiString: "" };
    }

    const encodedPa = encodeURIComponent(trimmed);
    const encodedPn = encodeURIComponent(MERCHANT_NAME);
    const encodedTn = encodeURIComponent(`Order_${orderId}`);

    const str = `upi://pay?pa=${encodedPa}&pn=${encodedPn}&am=${amount.toFixed(
      2
    )}&cu=INR&tn=${encodedTn}`;

    return { canUseUpi: true, upiString: str };
  }, [upiId, amount, orderId]);

  const handleCashRequest = async () => {
    setIsSubmitting(true);
    await requestPayment(orderId, "Cash");
    setIsSubmitting(false);
    onClose();
  };

  const handleUPIRequest = async () => {
    if (!canUseUpi) return;
    setIsSubmitting(true);
    await requestPayment(orderId, "UPI");
    setIsSubmitting(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Make Payment</DialogTitle>
          <DialogDescription>
            Choose your preferred payment method for ₹{amount.toFixed(2)}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="upi" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upi">UPI / Online</TabsTrigger>
            <TabsTrigger value="cash">Cash</TabsTrigger>
          </TabsList>

          {/* UPI TAB */}
          <TabsContent value="upi" className="space-y-4 py-4">
            {canUseUpi ? (
              <>
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div className="p-4 bg-white rounded-xl border shadow-sm">
                    <QRCodeCanvas value={upiString} size={200} level="H" />
                  </div>
                  <p className="text-xs text-muted-foreground text-center">
                    Scan with GPay, PhonePe, Paytm, etc.
                  </p>

                  <div className="w-full relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">
                        Or on Mobile
                      </span>
                    </div>
                  </div>

                  <Button className="w-full gap-2" asChild>
                    <a href={upiString}>
                      <Smartphone className="h-4 w-4" /> Open UPI App
                    </a>
                  </Button>
                </div>
                <Button
                  onClick={handleUPIRequest}
                  disabled={isSubmitting}
                  className="w-full mt-4"
                  variant="secondary"
                >
                  Payment completed
                </Button>
              </>
            ) : (
              <div className="space-y-4 py-6 text-center">
                <p className="text-sm text-muted-foreground">
                  UPI payment is not configured yet. Please contact the staff or
                  pay by cash.
                </p>
              </div>
            )}
          </TabsContent>

          {/* CASH TAB */}
          <TabsContent value="cash" className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-6">
              <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
                <Banknote className="h-8 w-8 text-green-600" />
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold">Pay at Counter / Table</h3>
                <p className="text-sm text-muted-foreground">
                  Please request the staff to collect cash.
                </p>
              </div>
            </div>
            <Button
              onClick={handleCashRequest}
              disabled={isSubmitting}
              className="w-full"
            >
              Request Cash Collection <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
