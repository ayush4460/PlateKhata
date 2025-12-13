"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Save } from "lucide-react";

export default function SettingsPage() {
  const {
    taxRate,
    discountRate,
    upiId,
    updateSettings,
    isCartLoading, // reusing this loading state which initially fetches settings too
  } = useCart();
  const { toast } = useToast();

  const [localTax, setLocalTax] = useState("");
  const [localDiscount, setLocalDiscount] = useState("");
  const [localUpi, setLocalUpi] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Sync state when context loads
  useEffect(() => {
    if (!isCartLoading) {
      setLocalTax(String(taxRate));
      setLocalDiscount(String(discountRate));
      setLocalUpi(upiId || "");
    }
  }, [isCartLoading, taxRate, discountRate, upiId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const t = parseFloat(localTax);
    const d = parseFloat(localDiscount);

    if (isNaN(t) || isNaN(d) || t < 0 || d < 0) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Tax and Discount must be non-negative numbers.",
      });
      setIsSaving(false);
      return;
    }

    try {
      await updateSettings(t, d, localUpi.trim());
      toast({
        title: "Settings Saved",
        description: "Store configuration updated successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to save settings.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Store Settings</h1>
        <p className="text-muted-foreground">
          Configure tax rates, discounts, and payment details.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Financial Configuration</CardTitle>
            <CardDescription>
              Set the default tax and discount rates applied to all orders.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax">Tax Rate (%)</Label>
                <Input
                  id="tax"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={localTax}
                  onChange={(e) => setLocalTax(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discount">Discount Rate (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={localDiscount}
                  onChange={(e) => setLocalDiscount(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payment Configuration</CardTitle>
            <CardDescription>
              Set up details for digital payments (UPI).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="upi">UPI ID (VPA)</Label>
              <Input
                id="upi"
                type="text"
                placeholder="merchant@upi"
                value={localUpi}
                onChange={(e) => setLocalUpi(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                This ID will be used to generate QR codes for customer payments.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSaving || isCartLoading}>
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
