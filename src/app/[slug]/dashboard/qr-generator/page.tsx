// src/app/[slug]/dashboard/qr-generator/page.tsx
"use client";

import { useState, useEffect } from "react";
// import QRCode from 'qrcode.react'; // Removed for secure backend generation
import Image from "next/image";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { PlusCircle, UtensilsCrossed, Trash2 } from "lucide-react";

export default function QrGeneratorPage() {
  const [baseUrl, setBaseUrl] = useState("");
  const [newTableNumber, setNewTableNumber] = useState("");
  const [newTableCapacity, setNewTableCapacity] = useState("");

  const {
    tableStatuses,
    createTable,
    deleteTable,
    restaurantName,
    restaurantTagline,
  } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== "undefined") {
      setBaseUrl(window.location.origin);
    }
  }, []);

  const handleAddTable = async () => {
    const tableNumStr = newTableNumber.trim();
    const capacityNum = parseInt(newTableCapacity, 10);

    if (!tableNumStr) {
      toast({
        variant: "destructive",
        title: "Invalid Input",
        description: "Please enter a table number.",
      });
      return;
    }

    if (isNaN(capacityNum) || capacityNum < 1 || capacityNum > 20) {
      toast({
        variant: "destructive",
        title: "Invalid Capacity",
        description: "Please enter a capacity between 1 and 20.",
      });
      return;
    }

    const success = await createTable(tableNumStr, capacityNum);

    if (success) {
      setNewTableNumber("");
      setNewTableCapacity("");
    }
  };

  const handleDeleteTable = async (id: number) => {
    const confirmed = window.confirm(
      "Delete this table, its QR code, and all active orders?"
    );
    if (!confirmed) return;

    const success = await deleteTable(id);
    if (!success) {
      toast({
        variant: "destructive",
        title: "Failed to delete table",
        description: "Something went wrong while deleting the table.",
      });
    } else {
      toast({
        title: "Table deleted",
        description: "The table, QR code, and active orders were removed.",
      });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (!baseUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <p>Loading QR Codes...</p>
      </div>
    );
  }

  const displayRestaurantName = restaurantName || "Axios";
  const displayTagline = restaurantTagline || "Scan, Order, Enjoy!";

  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8 print:gap-4">
      <div className="print:hidden grid gap-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">QR Code Generator</h1>
          <Button onClick={handlePrint}>Print QR Codes</Button>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Add New Table</CardTitle>
              <CardDescription>
                Generate a QR code for a new table.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-table">Table Number</Label>
                <Input
                  id="new-table"
                  type="text"
                  placeholder="e.g., A5 or 12"
                  value={newTableNumber}
                  onChange={(e) => setNewTableNumber(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-capacity">Capacity</Label>
                <Input
                  id="new-capacity"
                  type="number"
                  placeholder="e.g., 4"
                  value={newTableCapacity}
                  onChange={(e) => setNewTableCapacity(e.target.value)}
                  min="1"
                  max="20"
                />
              </div>

              <div className="flex justify-end">
                <Button onClick={handleAddTable}>
                  <PlusCircle className="mr-2 h-4 w-4" /> Add Table
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage Instructions</CardTitle>
              <CardDescription>
                Configure restaurant details in <strong>Settings</strong> to
                update the cards.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                The restaurant name "<strong>{displayRestaurantName}</strong>"
                and tagline will appear on all printed QR codes. Visit the
                Settings page to update these details.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 print:grid-cols-3 print:gap-4"
        id="qr-code-grid"
      >
        {tableStatuses
          .sort((a, b) => {
            const numA = parseInt(a.tableNumber);
            const numB = parseInt(b.tableNumber);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.tableNumber.localeCompare(b.tableNumber);
          })
          .map((table) => (
            <Card
              key={table.id}
              className="text-center break-inside-avoid print:border-2 print:shadow-none"
            >
              <CardContent className="flex flex-col items-center justify-center gap-4 p-6">
                <div className="flex w-full items-start justify-between print:hidden">
                  <div className="text-left">
                    <h2 className="text-xl font-bold">
                      {displayRestaurantName}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {displayTagline}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => handleDeleteTable(table.id)}
                    aria-label="Delete table"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <div className="text-center hidden print:block">
                  <h2 className="text-xl font-bold">{displayRestaurantName}</h2>
                  <p className="text-sm text-muted-foreground">
                    {displayTagline}
                  </p>
                </div>

                <div className="p-4 bg-white rounded-lg border flex justify-center qr-image-container">
                  {table.qrCodeUrl ? (
                    <div className="relative w-[150px] h-[150px]">
                      <Image
                        src={table.qrCodeUrl}
                        alt={`QR Code for Table ${table.tableNumber}`}
                        fill
                        className="object-contain"
                      />
                    </div>
                  ) : (
                    <div className="w-[150px] h-[150px] flex items-center justify-center bg-muted text-muted-foreground text-xs">
                      QR Not Available
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    Table {table.tableNumber}
                  </p>
                  <p className="text-xs text-muted-foreground break-all print:hidden">
                    Scan to Order
                  </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <UtensilsCrossed className="h-3 w-3" />
                  <span>Powered by {displayRestaurantName}</span>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #qr-code-grid,
          #qr-code-grid * {
            visibility: visible;
          }
          #qr-code-grid {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            gap: 1rem;
          }
          .qr-image-container img {
            visibility: visible !important;
            -webkit-print-color-adjust: exact;
          }
        }
        @page {
          size: A4;
          margin: 1cm;
        }
      `}</style>
    </div>
  );
}
