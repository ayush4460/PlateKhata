// src/app/cart/page.tsx
'use client';

import { useCart } from '@/hooks/use-cart';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { BottomNav } from '@/components/layout/bottom-nav';
import { Minus, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function CartPage() {
  const { cart, updateQuantity, removeFromCart, getTotalPrice, placeOrder, taxRate, isCartLoading, tableNumber } = useCart();
  const router = useRouter();
  const [isClient, setIsClient] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState(''); // <-- ADDED STATE
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const { toast } = useToast();
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  const subtotal = getTotalPrice();
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const handlePlaceOrder = async () => {
    // Check for all three fields
    if (!customerName || !customerPhone || !customerEmail) {
        toast({
            variant: "destructive",
            title: "Missing Information",
            description: "Please enter your name, phone number, and email."
        });
        return;
    }
    
    // Simple email regex validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(customerEmail)) {
         toast({
            variant: "destructive",
            title: "Invalid Email",
            description: "Please enter a valid email address."
        });
        return;
    }

    if (!/^[6-9]\d{9}$/.test(customerPhone)) {
        toast({ variant: "destructive", title: "Invalid Phone", description: "Please enter a valid 10-digit phone number." });
        return;
    }
    
    setIsPlacingOrder(true);
    
    // Pass the new email field to the placeOrder function
    const success = await placeOrder(total, {
        name: customerName,
        phone: customerPhone,
        email: customerEmail // <-- PASS EMAIL
    });
    
    setIsPlacingOrder(false);

    if (success) {
      setIsCheckoutOpen(false);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail(''); // <-- CLEAR EMAIL STATE
      router.push('/orders');
    }
    // Error toast is handled by the hook
  };
  
  if (!isClient || isCartLoading) {
    return <div className="flex items-center justify-center h-screen bg-background"><p>Loading...</p></div>;
  }

  return (
    <div className="bg-background min-h-screen pb-24">
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 p-4 border-b">
        <h1 className="text-2xl font-bold text-center">My Cart</h1>
      </header>

      <main className="p-4">
        {cart.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground mb-4">Your cart is empty.</p>
            <Button asChild>
              <Link href="/">Go to Menu</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cart Items List */}
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center gap-4">
                  <Image
                    src={item.image.url}
                    alt={item.name}
                    width={80}
                    height={80}
                    className="rounded-lg object-cover aspect-square"
                  />
                  <div className="flex-1">
                    <h3 className="font-semibold">{item.name}</h3>
                    <p className="text-sm text-muted-foreground">₹{item.price.toFixed(2)}</p>
                    <div className="flex items-center gap-2 mt-2">
                       <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity - 1)} disabled={item.quantity <= 1}>
                         <Minus className="h-4 w-4" />
                       </Button>
                       <span className="font-bold w-4 text-center">{item.quantity}</span>
                       <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                         <Plus className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="font-bold">₹{(item.price * item.quantity).toFixed(2)}</p>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive" onClick={() => removeFromCart(item.id)}>
                      <Trash2 className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Bill Details */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Bill Details</h2>
                <div className="space-y-2">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Tax ({(taxRate * 100).toFixed(0)}%)</span>
                        <span>₹{tax.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                        <span>Total</span>
                        <span>₹{total.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Checkout Dialog */}
            <Dialog open={isCheckoutOpen} onOpenChange={setIsCheckoutOpen}>
                <DialogTrigger asChild>
                    <Button size="lg" className="w-full" disabled={!tableNumber}>
                        {tableNumber ? 'Place Order' : 'Please scan a table first'}
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Almost there!</DialogTitle>
                        <DialogDescription>
                            Please enter your details to place the order. This will be used for your receipt.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" placeholder="John Doe" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input id="phone" type="tel" placeholder="9876543210" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
                        </div>
                        {/* --- ADDED EMAIL FIELD --- */}
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input id="email" type="email" placeholder="john.doe@example.com" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} />
                        </div>
                        {/* --- END ADDED FIELD --- */}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCheckoutOpen(false)}>Cancel</Button>
                        <Button onClick={handlePlaceOrder} disabled={isPlacingOrder}>
                            {isPlacingOrder ? "Placing Order..." : "Confirm & Place Order"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}