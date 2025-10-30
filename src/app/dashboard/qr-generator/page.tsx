// src/app/dashboard/qr-generator/page.tsx
'use client'; // <-- FIX #1: Add this directive

import { useState, useEffect } from 'react';
import QRCode from 'qrcode.react'; // Or 'qrcode.react' if you installed that
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useCart } from '@/hooks/use-cart';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, UtensilsCrossed } from 'lucide-react';

export default function QrGeneratorPage() {
  const [baseUrl, setBaseUrl] = useState('');
  const [restaurantName, setRestaurantName] = useState('MunchMate');
  const [tagline, setTagline] = useState('Scan, Order, Enjoy!');
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState(''); // <-- FIX #2: Add capacity state
  
  // --- FIX #3: Use 'createTable' from the hook ---
  const { tableStatuses, createTable } = useCart(); 
  const { toast } = useToast();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBaseUrl(window.location.origin);
      const savedName = localStorage.getItem('qrRestaurantName');
      const savedTagline = localStorage.getItem('qrTagline');
      if (savedName) setRestaurantName(savedName);
      if (savedTagline) setTagline(savedTagline);
    }
  }, []);

  const handleSaveDetails = () => {
    localStorage.setItem('qrRestaurantName', restaurantName);
    localStorage.setItem('qrTagline', tagline);
    toast({
      title: 'Details Saved',
      description: 'Your restaurant name and tagline have been updated.',
    });
  };

  // --- FIX #4: Update handler to use createTable and capacity ---
  const handleAddTable = async () => {
    const tableNumStr = newTableNumber.trim();
    const capacityNum = parseInt(newTableCapacity, 10);

    if (!tableNumStr) {
        toast({ variant: 'destructive', title: 'Invalid Input', description: 'Please enter a table number.'});
        return;
    }

    if (isNaN(capacityNum) || capacityNum < 1 || capacityNum > 20) {
      toast({
        variant: 'destructive',
        title: 'Invalid Capacity',
        description: 'Please enter a capacity between 1 and 20.',
      });
      return;
    }

    // Call the createTable function from the hook
    const success = await createTable(tableNumStr, capacityNum);

    if (success) {
      // Toast is handled by the hook on success/failure
      setNewTableNumber('');
      setNewTableCapacity('');
    }
  }
  // --- END FIX ---

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
                    <CardTitle>Restaurant Details</CardTitle>
                    <CardDescription>Customize the details shown on the QR code cards.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="restaurant-name">Restaurant Name</Label>
                        <Input id="restaurant-name" value={restaurantName} onChange={(e) => setRestaurantName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tagline">Tagline</Label>
                        <Input id="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleSaveDetails}>Save Details</Button>
                    </div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle>Add New Table</CardTitle>
                    <CardDescription>Generate a QR code for a new table.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="new-table">Table Number</Label>
                        <Input id="new-table" type="text" placeholder="e.g., A5 or 12" value={newTableNumber} onChange={(e) => setNewTableNumber(e.target.value)} />
                    </div>
                    {/* --- FIX #5: Add Capacity Input Field --- */}
                    <div className="space-y-2">
                        <Label htmlFor="new-capacity">Capacity</Label>
                        <Input id="new-capacity" type="number" placeholder="e.g., 4" value={newTableCapacity} onChange={(e) => setNewTableCapacity(e.target.value)} min="1" max="20" />
                    </div>
                    {/* --- END FIX --- */}
                    <div className="flex justify-end">
                        <Button onClick={handleAddTable}><PlusCircle className="mr-2 h-4 w-4" /> Add Table</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 print:grid-cols-3 print:gap-4" id="qr-code-grid">
        {tableStatuses.sort((a, b) => {
            const numA = parseInt(a.tableNumber); const numB = parseInt(b.tableNumber);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a.tableNumber.localeCompare(b.tableNumber);
        }).map((table) => (
          <Card key={table.id} className="text-center break-inside-avoid print:border-2 print:shadow-none">
            <CardContent className="flex flex-col items-center justify-center gap-4 p-6">
                <div className='text-center'>
                    <h2 className="text-xl font-bold">{restaurantName}</h2>
                    <p className="text-sm text-muted-foreground">{tagline}</p>
                </div>
                <div className="p-4 bg-white rounded-lg border">
                    <QRCode
                        value={`${baseUrl}/?table=${table.tableNumber}`}
                        size={150}
                        level="H"
                        includeMargin={true}
                        renderAs="canvas"
                        className="qr-canvas"
                    />
                </div>
                <div className="text-center">
                    <p className="text-2xl font-bold">Table {table.tableNumber}</p>
                    <p className="text-xs text-muted-foreground break-all print:hidden">
                        {`${baseUrl}/?table=${table.tableNumber}`}
                    </p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <UtensilsCrossed className="h-3 w-3" />
                    <span>Powered by MunchMate</span>
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
           #qr-code-grid, #qr-code-grid * {
             visibility: visible;
           }
           #qr-code-grid {
             position: absolute;
             left: 0;
             top: 0;
             width: 100%;
             gap: 1rem;
           }
           .qr-canvas {
             visibility: visible !important;
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