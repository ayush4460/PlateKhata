// src/app/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Star,
  Cake,
  GlassWater,
  ShoppingCart,
  UtensilsCrossed,
  Flame,
  AlertCircle,
  Croissant,
  Circle,
  Salad,
  Soup,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { BottomNav } from '@/components/layout/bottom-nav';
import type { MenuItem } from '@/lib/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useCart } from '@/hooks/use-cart';
import { ThemeToggle } from '@/components/layout/theme-toggle';

const categories = [
  { name: 'Specials', id: 'specials', icon: Star },
  { name: 'Appetizers', id: 'appetizers', icon: Sparkles },
  { name: 'Starters', id: 'starters', icon: Flame },
  { name: 'Soups', id: 'soups', icon: Soup },
  { name: 'Salads', id: 'salads', icon: Salad },
  { name: 'Main Course', id: 'main course', icon: UtensilsCrossed },
  { name: 'Breads', id: 'breads', icon: Croissant },
  { name: 'Beverages', id: 'beverages', icon: GlassWater },
  { name: 'Desserts', id: 'desserts', icon: Cake },
];



function MenuContent() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const { addToCart, cart, menuItems: fallbackMenuItems, tableNumber, setTable } = useCart();
  const searchParams = useSearchParams();

  const [remoteMenuItems, setRemoteMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  useEffect(() => {
    const tableQueryParam = searchParams.get('table');
    if (tableQueryParam) {
      setTable(tableQueryParam);
    }
  }, [searchParams, setTable]);

  const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(/\/$/, '');

  // Fetch menu items (public)
  useEffect(() => {
    let cancelled = false;

    async function fetchMenu() {
      setIsLoadingMenu(true);
      try {
        const url = `${API_BASE}/menu`;
        // console.log('[menu] fetching', url);

        const res = await fetch(url, { method: 'GET', headers: { 'Content-Type': 'application/json' } });
        // console.log('[menu] response status', res.status, res.url);

        let raw: any = null;
        try {
          raw = await res.json();
        } catch (err) {
          raw = await res.text().catch(() => null);
        }

        if (!res.ok) {
          console.warn('[menu] fetch returned non-ok status', res.status);
          setRemoteMenuItems([]);
          return;
        }

        let arr: any[] = [];
        if (Array.isArray(raw)) arr = raw;
        else if (Array.isArray(raw?.data)) arr = raw.data;
        else if (Array.isArray(raw?.items)) arr = raw.items;
        else {
          const firstArray = Object.values(raw || {}).find((v) => Array.isArray(v));
          if (Array.isArray(firstArray)) arr = firstArray as any[];
        }

        const mapped: MenuItem[] = (arr || []).map((o: any, idx: number) => {
          const id = String(o.item_id ?? o.id ?? o.itemId ?? o._id ?? `menu-${Date.now()}-${idx}`);

          const imageRaw = o.image_url ?? o.imageUrl ?? o.image?.url ?? o.image;
          const imageUrl =
            !imageRaw
              ? 'https://placehold.co/300x300'
              : String(imageRaw).startsWith('http')
              ? String(imageRaw)
              : `${API_BASE}${String(imageRaw).startsWith('/') ? '' : '/'}${String(imageRaw)}`;

          const isAvailable = o.is_available === true || o.is_available === 'true' || Number(o.is_available) === 1;
          const isVegetarian = o.is_vegetarian === true || o.is_vegetarian === 'true' || Number(o.is_vegetarian) === 1;

          return {
            id,
            name: String(o.name ?? 'Unnamed'),
            description: String(o.description ?? ''),
            price: Number(parseFloat(String(o.price ?? '0')) || 0),
            category: String(o.category ?? 'Uncategorized'),
            image: { url: imageUrl, hint: '' },
            isAvailable,
            isVegetarian,
            preparationTime: o.preparation_time ?? o.preparationTime ?? null,
          } as MenuItem;
        });



        if (!cancelled) setRemoteMenuItems(mapped);
      } catch (err) {
        console.error('[menu] Error fetching menu items', err);
        setRemoteMenuItems([]);
      } finally {
        if (!cancelled) setIsLoadingMenu(false);
      }
    }

    fetchMenu();
    return () => {
      cancelled = true;
    };
  }, [API_BASE]);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCart = (item: MenuItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    addToCart(item);
  };

  const displayedMenu = remoteMenuItems;


  const filteredMenu = displayedMenu.filter(item => {
    const matchesCategory =
      selectedCategory === 'all'
        ? true
        : item.category.toLowerCase() === selectedCategory;

    const matchesSearch =
      searchQuery.trim() === ''
        ? true
        : item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });


  const renderNoTableWarning = () => (
    <div className="p-4">
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>No Table Selected</AlertTitle>
        <AlertDescription>
          Please access this page using the QR code link on your table to start an order.
        </AlertDescription>
      </Alert>
    </div>
  );

  if (isLoadingMenu) {
    return <div className="flex items-center justify-center h-screen bg-background"><p>Loading Menu...</p></div>;
  }

  return (
    <div className={cn("bg-background min-h-screen pb-24")}>
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 p-4 space-y-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
            <span className="font-headline">MunchMate {tableNumber && `- Table ${tableNumber}`}</span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/cart" className="relative hidden md:block">
              <ShoppingCart className="h-6 w-6 text-foreground" />
              {cartItemCount > 0 && (
                <Badge className="absolute -top-2 -right-3 h-5 w-5 flex items-center justify-center p-0">{cartItemCount}</Badge>
              )}
            </Link>
          </div>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="What are you craving?"
            className="pl-10 h-12 w-full rounded-full bg-muted border-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!tableNumber}
          />
        </div>
      </header>

      <main className="p-4">
        {!tableNumber && renderNoTableWarning()}

        {tableNumber && (
          <>
            <div className="pb-4">
              <div className="flex space-x-2 overflow-x-auto pb-2 -mx-4 px-4">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  className={cn(
                    'rounded-full whitespace-nowrap flex items-center gap-2',
                    selectedCategory === 'all' ? 'bg-primary text-primary-foreground' : 'bg-card'
                  )}
                  onClick={() => setSelectedCategory('all')}
                >
                  All
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    className={cn(
                      'rounded-full whitespace-nowrap flex items-center gap-2',
                      selectedCategory === category.id ? 'bg-primary text-primary-foreground' : 'bg-card'
                    )}
                    onClick={() => setSelectedCategory(category.id)}
                  >
                    <category.icon className="h-4 w-4" />
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredMenu.map((item) => (
                <Card
                  key={item.id}
                  className={cn(
                    "overflow-hidden rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-1 cursor-pointer",
                    !item.isAvailable && "opacity-60"
                  )}
                  onClick={() => setSelectedItem(item)}
                >
                  <CardContent className="p-0">
                    <div className="relative">
                      <Image
                        src={item.image.url}
                        alt={item.name}
                        width={300}
                        height={300}
                        data-ai-hint={item.image.hint}
                        className="aspect-square w-full object-cover"
                      />

                      {/* --- VEG/NON-VEG BADGE --- */}
                      {item.isVegetarian ? (
                        <Badge className="absolute top-2 right-2 bg-transparent p-1 rounded-full border-none">
                          <Circle className="h-4 w-4 text-green-600 fill-green-600" />
                        </Badge>
                      ) : (
                        <Badge className="absolute top-2 right-2 bg-transparent p-1 rounded-full border-none">
                          <Circle className="h-4 w-4 text-red-600 fill-red-600" />
                        </Badge>
                      )}


                      {!item.isAvailable && (
                        <Badge variant="destructive" className="absolute top-2 left-2">UNAVAILABLE</Badge>
                      )}

                    </div>
                    <div className="p-3 space-y-2 flex flex-col">
                      <h3 className="font-semibold text-sm truncate">{item.name}</h3>
                      <p className="text-xs text-muted-foreground line-clamp-2 h-8 flex-grow">
                        {item.description}
                      </p>
                      <div className="flex items-center justify-between pt-1">
                        <span className="font-bold text-sm">₹{item.price.toFixed(2)}</span>
                        <Button size="sm" className="h-8 rounded-full" onClick={(e) => handleAddToCart(item, e)} disabled={!item.isAvailable}>
                          Add
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>

      {selectedItem && (
        <Sheet open={!!selectedItem} onOpenChange={(isOpen) => !isOpen && setSelectedItem(null)}>
          <SheetContent side="bottom" className="rounded-t-2xl max-h-[80svh] overflow-y-auto">
            <SheetHeader className="text-left">
              <div className="relative w-full h-48 rounded-lg overflow-hidden mb-4">
                <Image
                  src={selectedItem.image.url}
                  alt={selectedItem.name}
                  fill
                  className="object-cover"
                />

                {selectedItem.isVegetarian ? (
                  <Badge className="absolute top-2 right-2 bg-transparent p-1 rounded-full border-none">
                    <Circle className="h-4 w-4 text-green-600 fill-green-600" />
                  </Badge>
                ) : (
                  <Badge className="absolute top-2 right-2 bg-transparent p-1 rounded-full border-none">
                    <Circle className="h-4 w-4 text-red-600 fill-red-600" />
                  </Badge>
                )}

              </div>
              <SheetTitle className="text-2xl">{selectedItem.name}</SheetTitle>
              <SheetDescription>{selectedItem.description}</SheetDescription>
            </SheetHeader>
            <div className="py-4">
              <p className="text-lg font-bold">₹{selectedItem.price.toFixed(2)}</p>
            </div>
            <SheetFooter>
              <Button type="submit" size="lg" className="w-full" onClick={() => {
                handleAddToCart(selectedItem);
                setSelectedItem(null);
              }} disabled={!selectedItem.isAvailable}>
                {selectedItem.isAvailable ? 'Add to Cart' : 'Unavailable'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      <BottomNav />
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-background"><p>Loading Menu...</p></div>}>
      <MenuContent />
    </Suspense>
  );
}
