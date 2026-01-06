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

  const [isAdding, setIsAdding] = useState(false);

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

    try {
      setIsAdding(true);
      const success = await createTable(tableNumStr, capacityNum);

      if (success) {
        setNewTableNumber("");
        setNewTableCapacity("");
      }
    } finally {
      setIsAdding(false);
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
        <p className="text-muted-foreground animate-pulse">
          Loading QR Codes...
        </p>
      </div>
    );
  }

  const displayRestaurantName = restaurantName || "PlateKhata";
  const displayTagline = restaurantTagline || "Scan, Order, Enjoy!";

  return (
    <div className="space-y-6 p-4 md:p-8 lg:p-10 max-w-7xl mx-auto">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden text-center sm:text-left">
        <div>
          <h1 className="text-2xl md:text-3xl font-light tracking-tight">
            QR Generator
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            Manage tables and print QR codes.
          </p>
        </div>
        <Button
          onClick={handlePrint}
          variant="outline"
          className="print:hidden w-full sm:w-auto"
        >
          Print QR Codes
        </Button>
      </div>

      {/* Add Table Section - Minimal Inline Form */}
      <div className="print:hidden bg-card/50 border border-border/40 rounded-xl p-4 md:p-6 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col md:flex-row items-end gap-4">
          <div className="grid w-full gap-2">
            <Label
              htmlFor="new-table"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
            >
              Table Number
            </Label>
            <Input
              id="new-table"
              type="text"
              placeholder="e.g. 5"
              value={newTableNumber}
              onChange={(e) => setNewTableNumber(e.target.value)}
              className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors h-11"
            />
          </div>
          <div className="grid w-full gap-2">
            <Label
              htmlFor="new-capacity"
              className="text-xs font-medium text-muted-foreground uppercase tracking-wider"
            >
              Capacity
            </Label>
            <Input
              id="new-capacity"
              type="number"
              placeholder="e.g. 4"
              value={newTableCapacity}
              onChange={(e) => setNewTableCapacity(e.target.value)}
              min="1"
              max="20"
              className="bg-background/50 border-border/50 focus:border-primary/50 transition-colors h-11"
            />
          </div>
          <Button
            onClick={handleAddTable}
            disabled={isAdding}
            className="h-11 w-full md:w-auto min-w-[140px] font-medium"
          >
            {isAdding ? "Adding..." : "Add Table"}
          </Button>
        </div>
      </div>

      {/* QR Grid */}
      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 print:grid-cols-3 print:gap-8"
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
            <div
              key={table.id}
              className="group relative flex flex-col items-center p-8 bg-card rounded-2xl border border-border/40 shadow-sm hover:shadow-md transition-all duration-300 hover:border-border/80 break-inside-avoid print:border-2 print:shadow-none print:p-4"
            >
              {/* Delete Button - Absolute Top Right */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-all duration-200 text-muted-foreground hover:bg-red-50 hover:text-red-600 print:hidden h-8 w-8"
                onClick={() => handleDeleteTable(table.id)}
                aria-label="Delete table"
              >
                <Trash2 className="h-4 w-4" />
              </Button>

              {/* Print Context Header */}
              <div className="text-center hidden print:block mb-4">
                <h2 className="text-lg font-bold text-black">
                  {displayRestaurantName}
                </h2>
                <p className="text-xs text-gray-500">{displayTagline}</p>
              </div>

              {/* QR Code */}
              <div className="relative w-40 h-40 mb-6 p-2 bg-white rounded-xl shadow-sm border border-gray-100 qr-image-container flex items-center justify-center">
                {table.qrCodeUrl ? (
                  <div className="relative w-full h-full">
                    <Image
                      src={table.qrCodeUrl}
                      alt={`QR Code for Table ${table.tableNumber}`}
                      fill
                      className="object-contain" // Use object-contain to ensure the whole QR is visible and not cropped
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-[10px] rounded-lg">
                    Generating...
                  </div>
                )}
              </div>

              {/* Table Info */}
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest print:text-black">
                  Table
                </p>
                <p className="text-4xl font-light text-foreground print:text-black print:font-bold">
                  {table.tableNumber}
                </p>
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-[10px] text-muted-foreground print:hidden">
                <UtensilsCrossed className="h-3 w-3" />
                <span>{displayRestaurantName}</span>
              </div>
              <p className="hidden print:block text-xs mt-2 text-gray-500">
                Scan to Order
              </p>
            </div>
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
            display: grid;
            padding: 2rem;
            background: white;
          }
          /* Ensure images print correctly */
          img {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
        @page {
          size: A4;
          margin: 0;
        }
      `}</style>
    </div>
  );
}
