//src/app/[slug]/dashboard/settings/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/hooks/use-cart";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, Save, TriangleAlert } from "lucide-react";

export default function SettingsPage() {
  const {
    taxRate,
    discountRate,
    upiId,
    zomatoRestaurantId,
    swiggyRestaurantId,
    restaurantName,
    restaurantAddress,
    restaurantTagline,
    contactEmail,
    contactNumber,
    fssaiLicNo,
    gstin,
    caEmail,
    updateSettings,
    isCartLoading,
  } = useCart();
  const { toast } = useToast();

  const [localTax, setLocalTax] = useState("");
  const [localDiscount, setLocalDiscount] = useState("");
  const [localUpi, setLocalUpi] = useState("");
  const [localZomato, setLocalZomato] = useState("");
  const [localSwiggy, setLocalSwiggy] = useState("");

  const [localName, setLocalName] = useState("");
  const [localAddress, setLocalAddress] = useState("");
  const [localTagline, setLocalTagline] = useState("");
  const [localEmail, setLocalEmail] = useState("");
  const [localContactNumber, setLocalContactNumber] = useState("");
  const [localFssai, setLocalFssai] = useState("");
  const [localGstin, setLocalGstin] = useState("");
  const [localCaEmail, setLocalCaEmail] = useState("");

  const [isSaving, setIsSaving] = useState(false);

  // Sync state when context loads
  useEffect(() => {
    if (!isCartLoading) {
      setLocalTax(String(taxRate));
      setLocalDiscount(String(discountRate));
      setLocalUpi(upiId || "");
      setLocalZomato(zomatoRestaurantId || "");
      setLocalSwiggy(swiggyRestaurantId || "");

      setLocalName(restaurantName || "");
      setLocalAddress(restaurantAddress || "");
      setLocalTagline(restaurantTagline || "");
      setLocalEmail(contactEmail || "");
      setLocalContactNumber(contactNumber || "");
      setLocalFssai(fssaiLicNo || "");
      setLocalGstin(gstin || "");
      setLocalCaEmail(caEmail || "");
    }
  }, [
    isCartLoading,
    taxRate,
    discountRate,
    upiId,
    zomatoRestaurantId,
    swiggyRestaurantId,
    restaurantName,
    restaurantAddress,
    restaurantTagline,
    contactEmail,
  ]);

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
      await updateSettings(
        t,
        d,
        localUpi.trim(),
        localZomato.trim(),
        localSwiggy.trim(),
        localName.trim(),
        localAddress.trim(),
        localEmail.trim(),
        localTagline.trim(),
        localContactNumber.trim(),
        localFssai.trim(),
        localGstin.trim(),
        localCaEmail.trim()
      );
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

  const isNameChanged = localName.trim() !== (restaurantName || "").trim();

  return (
    <div className="max-w-4xl mx-auto w-full pb-20">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Store Settings</h1>
        <p className="text-muted-foreground">
          Manage your restaurant profile and configurations.
        </p>
      </div>

      <form onSubmit={handleSave} className="grid gap-6">
        {/* Restaurant Details */}
        <Card>
          <CardHeader>
            <CardTitle>Restaurant Profile</CardTitle>
            <CardDescription>
              Basic information about your restaurant displayed to customers.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isNameChanged && (
              <Alert variant="destructive">
                <TriangleAlert className="h-4 w-4" />
                <AlertTitle>Warning: URL Change</AlertTitle>
                <AlertDescription>
                  Changing the restaurant name will update your unique URL slug.
                  <strong>
                    {" "}
                    Existing QR codes and bookmarks will stop working.
                  </strong>
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Restaurant Name</Label>
                <Input
                  id="name"
                  value={localName}
                  onChange={(e) => setLocalName(e.target.value)}
                  placeholder="e.g. Tasty Bites"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={localTagline}
                  onChange={(e) => setLocalTagline(e.target.value)}
                  placeholder="e.g. Best Burgers in Town"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={localAddress}
                onChange={(e) => setLocalAddress(e.target.value)}
                placeholder="Full physical address"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Contact Email</Label>
              <Input
                id="email"
                type="email"
                value={localEmail}
                onChange={(e) => setLocalEmail(e.target.value)}
                placeholder="contact@restaurant.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactNumber">Contact Number</Label>
                <Input
                  id="contactNumber"
                  value={localContactNumber}
                  onChange={(e) => setLocalContactNumber(e.target.value)}
                  placeholder="e.g. +91 990 9000 317"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstin">GSTIN</Label>
                <Input
                  id="gstin"
                  value={localGstin}
                  onChange={(e) => setLocalGstin(e.target.value)}
                  placeholder="GST Identification Number"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fssai">FSSAI License No</Label>
              <Input
                id="fssai"
                value={localFssai}
                onChange={(e) => setLocalFssai(e.target.value)}
                placeholder="FSSAI License Number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="caEmail">CA Email Address</Label>
              <Input
                id="caEmail"
                type="email"
                value={localCaEmail}
                onChange={(e) => setLocalCaEmail(e.target.value)}
                placeholder="ca@firm.com"
              />
              <p className="text-xs text-muted-foreground">
                Start/End of Day reports will be sent to this email.
              </p>
            </div>
          </CardContent>
        </Card>

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

        {/* Online Ordering Config */}
        <Card>
          <CardHeader>
            <CardTitle>Online Ordering (Dyno Integration)</CardTitle>
            <CardDescription>
              Configure identification keys for food aggregators.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zomatoId">Zomato Restaurant ID</Label>
                <Input
                  id="zomatoId"
                  placeholder="Zomato ID"
                  value={localZomato}
                  onChange={(e) => setLocalZomato(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="swiggyId">Swiggy Restaurant ID</Label>
                <Input
                  id="swiggyId"
                  placeholder="Swiggy ID"
                  value={localSwiggy}
                  onChange={(e) => setLocalSwiggy(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end sticky bottom-4">
          <Button
            type="submit"
            disabled={isSaving || isCartLoading}
            size="lg"
            className="shadow-lg"
          >
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
