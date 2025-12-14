// src/app/page.tsx
"use client";

import { useState, useEffect, Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";
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
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/layout/bottom-nav";
import type { MenuItem, Category } from "@/lib/types"; // Added Category type
import { CategoryService } from "@/services/category.service"; // Added Service
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useCart } from "@/hooks/use-cart";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ThemeToggle } from "@/components/layout/theme-toggle";

const normalizeBool = (val: any) =>
  val === true || val === "true" || Number(val) === 1;

// Removed static CATEGORIES. Will fetch dynamically.

function MenuContent() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const {
    addToCart,
    cart,
    menuItems: fallbackMenuItems,
    tableNumber,
    setTable,
    setRestaurantId,
    restaurantId: stateRestaurantId,
    setTableId,
    setRestaurantSlug,
    setTableToken,
    // cart is already destructured
  } = useCart();
  const searchParams = useSearchParams();
  const restaurantId = searchParams.get("restaurantId");

  // Spice Dialog State
  const [showSpiceDialog, setShowSpiceDialog] = useState(false);
  const [spiceItem, setSpiceItem] = useState<MenuItem | null>(null);
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState("Regular");

  const [dynamicCategories, setDynamicCategories] = useState<Category[]>([]);
  const [remoteMenuItems, setRemoteMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  const API_BASE = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
  ).replace(/\/$/, "");

  useEffect(() => {
    const tableQueryParam = searchParams.get("table");
    const tokenQueryParam = searchParams.get("token");

    async function verifyToken() {
      if (tokenQueryParam) {
        try {
          console.log("[DEBUG] Verifying token:", tokenQueryParam);
          // Verify token with backend (Public Route)
          const res = await fetch(
            `${API_BASE}/public/tables/verify?token=${tokenQueryParam}`
          );
          console.log("[DEBUG] Verify response status:", res.status);

          if (res.ok) {
            const data = await res.json();
            console.log("[DEBUG] Verify response data:", data);

            const payload = data.data || data;
            if (tokenQueryParam) {
              console.log("[DEBUG SLUG] Found token param:", tokenQueryParam);
              if (setTableToken) {
                console.log("[DEBUG SLUG] Setting table token in context");
                setTableToken(tokenQueryParam);
              } else {
                console.warn(
                  "[DEBUG SLUG] setTableToken is missing from useCart"
                );
              }
            }

            if (payload && payload.tableNumber) {
              const tableNum = String(payload.tableNumber);
              console.log("[DEBUG] Setting table to:", tableNum);
              setTable(tableNum);

              // Set the real Table ID for API calls
              if (payload.tableId && setTableId) {
                setTableId(String(payload.tableId));
              }

              if (payload.restaurantId && setRestaurantId) {
                setRestaurantId(String(payload.restaurantId));
              }
              return;
            } else {
              console.warn("[DEBUG] Payload missing tableNumber:", payload);
            }
          } else {
            const errText = await res.text();
            console.error("[DEBUG] Verify failed:", errText);
          }
          // If invalid token
          setTable(null);
          console.warn("Invalid token or verification failed");
        } catch (e) {
          console.error("Token verification failed", e);
          setTable(null);
        }
      } else if (tableQueryParam) {
        // Manual entry detected! - REJECT IT
        // Secure mode: Only allow table set via token
        console.warn("Manual table entry rejected. Scan QR code.");
        setTable(null);
      } else {
        // No params
        setTable(null);
      }
    }

    verifyToken();
  }, [searchParams, setTable, API_BASE]);

  // API_BASE moved to top
  // Fetch menu items (public)

  const params = useParams();
  const slug = params?.slug as string;

  // Resolve slug to restaurantId
  useEffect(() => {
    async function resolveRestaurant() {
      if (!slug) return;

      try {
        // Strategy 1: Try direct lookup by slug
        console.log(`[Menu] Fetching restaurant by slug: ${slug}`);
        const response = await fetch(`${API_BASE}/public/restaurants/${slug}`);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            // Backend returns restaurantId, not id
            const rId = data.data.restaurantId || data.data.id;
            setRestaurantId(String(rId));
            if (slug && setRestaurantSlug) {
              console.log("[DEBUG SLUG] Setting restaurant slug:", slug);
              setRestaurantSlug(slug);
            }
            return;
          }
          console.warn(
            `[Menu] Could not resolve restaurant for slug: ${slug}, status: ${response.status}`
          );
        } else {
          console.warn(
            `[Menu] API Error resolving restaurant: ${response.status}`
          );
        }
      } catch (err) {
        console.error("Failed to resolve restaurant slug", err);
      }
    }

    resolveRestaurant();
  }, [slug, API_BASE, setRestaurantId]);

  useEffect(() => {
    if (restaurantId) {
      setRestaurantId(restaurantId);
    }
  }, [restaurantId, setRestaurantId]);

  // API_BASE moved to top
  // Fetch menu items (public)

  // Fetch menu items (public)
  useEffect(() => {
    let cancelled = false;

    async function fetchMenu() {
      // If we are on a dynamic route (slug exists) but haven't resolved the ID yet, wait.
      const targetId = stateRestaurantId || restaurantId; // prioritizing state, then query param

      if (slug && !targetId) {
        // console.log('[menu] Waiting for restaurant ID resolution...');
        return;
      }

      // Safety check for invalid ID
      if (targetId === "undefined" || targetId === "null") {
        console.warn("[menu] Invalid targetId detected:", targetId);
        setIsLoadingMenu(false);
        return;
      }

      setIsLoadingMenu(true);
      try {
        const query = targetId ? `?restaurantId=${targetId}` : "";
        const url = `${API_BASE}/menu${query}`;
        // console.log('[menu] fetching', url);

        const res = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });
        // console.log('[menu] response status', res.status, res.url);

        let raw: any = null;
        try {
          raw = await res.json();
        } catch (err) {
          raw = await res.text().catch(() => null);
        }

        if (!res.ok) {
          console.warn("[menu] fetch returned non-ok status", res.status);
          setRemoteMenuItems([]);
          return;
        }

        let arr: any[] = [];
        if (Array.isArray(raw)) arr = raw;
        else if (Array.isArray(raw?.data)) arr = raw.data;
        else if (Array.isArray(raw?.items)) arr = raw.items;
        else {
          const firstArray = Object.values(raw || {}).find((v) =>
            Array.isArray(v)
          );
          if (Array.isArray(firstArray)) arr = firstArray as any[];
        }

        const mapped: MenuItem[] = (arr || []).map((o: any, idx: number) => {
          const id = String(
            o.item_id ??
              o.id ??
              o.itemId ??
              o._id ??
              `menu-${Date.now()}-${idx}`
          );

          const imageRaw = o.image_url ?? o.imageUrl ?? o.image?.url ?? o.image;
          const imageUrl = !imageRaw
            ? "https://placehold.co/300x300"
            : String(imageRaw).startsWith("http")
            ? String(imageRaw)
            : `${API_BASE}${
                String(imageRaw).startsWith("/") ? "" : "/"
              }${String(imageRaw)}`;

          const isAvailable =
            o.is_available === true ||
            o.is_available === "true" ||
            Number(o.is_available) === 1;
          const isVegetarian =
            o.is_vegetarian === true ||
            o.is_vegetarian === "true" ||
            Number(o.is_vegetarian) === 1;

          // Resolve dietary type
          const dietaryType =
            o.dietary_type ||
            o.dietaryType ||
            (isVegetarian ? "veg" : "non_veg");

          return {
            id,
            name: String(o.name ?? "Unnamed"),
            description: String(o.description ?? ""),
            price: Number(parseFloat(String(o.price ?? "0")) || 0),
            category: String(o.category ?? "Uncategorized"),
            image: { url: imageUrl, hint: "" },
            isAvailable,
            isVegetarian,
            dietaryType, // Mapped
            preparationTime: o.preparation_time ?? o.preparationTime ?? null,
            hasSpiceLevels: normalizeBool(
              o.has_spice_levels ?? o.hasSpiceLevels
            ), // Added
          } as MenuItem;
        });

        if (!cancelled) setRemoteMenuItems(mapped);
      } catch (err) {
        console.error("[menu] Error fetching menu items", err);
        setRemoteMenuItems([]);
      } finally {
        if (!cancelled) setIsLoadingMenu(false);
      }
    }

    fetchMenu();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, stateRestaurantId, restaurantId, slug]);

  // Fetch Dynamic Categories
  useEffect(() => {
    const rId = stateRestaurantId || restaurantId;
    if (rId && rId !== "undefined") {
      CategoryService.getAll(Number(rId))
        .then((cats) => setDynamicCategories(cats))
        .catch((err) => console.error("Failed to load categories", err));
    }
  }, [stateRestaurantId, restaurantId]);

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const handleAddToCart = (item: MenuItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (item.hasSpiceLevels) {
      setSpiceItem(item);
      setSelectedSpiceLevel("Regular");
      setShowSpiceDialog(true);
    } else {
      addToCart(item);
    }
  };

  const confirmSpiceSelection = () => {
    if (spiceItem) {
      addToCart({ ...spiceItem, spiceLevel: selectedSpiceLevel } as any); // Cast to any or CartItem compatible
      setShowSpiceDialog(false);
      setSpiceItem(null);
    }
  };

  const displayedMenu = remoteMenuItems;

  const filteredMenu = displayedMenu.filter((item) => {
    const matchesCategory =
      selectedCategory === "all"
        ? true
        : item.category.toLowerCase() === selectedCategory;

    const matchesSearch =
      searchQuery.trim() === ""
        ? true
        : item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const renderNoTableWarning = () => (
    <div className="p-4">
      <Alert variant="default" className="bg-blue-50 border-blue-200">
        <Sparkles className="h-4 w-4 text-blue-500" />
        <AlertTitle className="text-blue-700">View Only Mode</AlertTitle>
        <AlertDescription className="text-blue-600">
          You are successfully connected to this restaurant's menu. To place an
          order, please scan the QR code at your table.
        </AlertDescription>
      </Alert>
    </div>
  );

  if (isLoadingMenu) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p>Loading Menu...</p>
      </div>
    );
  }

  return (
    <div className={cn("bg-background min-h-screen pb-24")}>
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 p-4 space-y-4 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold text-lg">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
            <span className="font-headline">
              MunchMate {tableNumber && `- Table ${tableNumber}`}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/cart" className="relative hidden md:block">
              <ShoppingCart className="h-6 w-6 text-foreground" />
              {cartItemCount > 0 && (
                <Badge className="absolute -top-2 -right-3 h-5 w-5 flex items-center justify-center p-0">
                  {cartItemCount}
                </Badge>
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

        <div className="pb-4">
          <div className="flex space-x-2 overflow-x-auto pb-2 -mx-4 px-4">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              className={cn(
                "rounded-full whitespace-nowrap flex items-center gap-2",
                selectedCategory === "all"
                  ? "bg-primary text-primary-foreground"
                  : "bg-card"
              )}
              onClick={() => setSelectedCategory("all")}
            >
              All
            </Button>
            {dynamicCategories.map((category) => (
              <Button
                key={category.id} // ID is unique
                variant={
                  selectedCategory === category.name.toLowerCase()
                    ? "default"
                    : "outline"
                }
                className={cn(
                  "rounded-full whitespace-nowrap flex items-center gap-2",
                  selectedCategory === category.name.toLowerCase()
                    ? "bg-primary text-primary-foreground"
                    : "bg-card"
                )}
                onClick={() => setSelectedCategory(category.name.toLowerCase())}
              >
                {/* Fallback Icon */}
                <UtensilsCrossed className="h-4 w-4" />
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

                  {/* --- DIETARY BADGE --- */}
                  {item.dietaryType === "eggitarian" ? (
                    <Badge className="absolute top-2 right-2 bg-transparent p-1 rounded-full border-none">
                      <Circle className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                    </Badge>
                  ) : item.isVegetarian || item.dietaryType === "veg" ? (
                    <Badge className="absolute top-2 right-2 bg-transparent p-1 rounded-full border-none">
                      <Circle className="h-4 w-4 text-green-600 fill-green-600" />
                    </Badge>
                  ) : (
                    <Badge className="absolute top-2 right-2 bg-transparent p-1 rounded-full border-none">
                      <Circle className="h-4 w-4 text-red-600 fill-red-600" />
                    </Badge>
                  )}

                  {!item.isAvailable && (
                    <Badge
                      variant="destructive"
                      className="absolute top-2 left-2"
                    >
                      UNAVAILABLE
                    </Badge>
                  )}
                </div>
                <div className="p-3 space-y-2 flex flex-col">
                  <h3 className="font-semibold text-sm truncate">
                    {item.name}
                  </h3>
                  <p className="text-xs text-muted-foreground line-clamp-2 h-8 flex-grow">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <span className="font-bold text-sm">
                      ₹{item.price.toFixed(2)}
                    </span>
                    <Button
                      size="sm"
                      className="h-8 rounded-full"
                      onClick={(e) => handleAddToCart(item, e)}
                      disabled={!item.isAvailable || !tableNumber}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>

      {selectedItem && (
        <Sheet
          open={!!selectedItem}
          onOpenChange={(isOpen) => !isOpen && setSelectedItem(null)}
        >
          <SheetContent
            side="bottom"
            className="rounded-t-2xl max-h-[80svh] overflow-y-auto"
          >
            <SheetHeader className="text-left">
              <div className="relative w-full h-48 rounded-lg overflow-hidden mb-4">
                <Image
                  src={selectedItem.image.url}
                  alt={selectedItem.name}
                  fill
                  className="object-cover"
                />

                {selectedItem.dietaryType === "eggitarian" ? (
                  <Badge className="absolute top-2 right-2 bg-transparent p-1 rounded-full border-none">
                    <Circle className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                  </Badge>
                ) : selectedItem.isVegetarian ||
                  selectedItem.dietaryType === "veg" ? (
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
              <p className="text-lg font-bold">
                ₹{selectedItem.price.toFixed(2)}
              </p>
            </div>
            <SheetFooter>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                onClick={() => {
                  handleAddToCart(selectedItem);
                  setSelectedItem(null);
                }}
                disabled={!selectedItem.isAvailable || !tableNumber}
              >
                {selectedItem.isAvailable
                  ? tableNumber
                    ? "Add to Cart"
                    : "View Only (No Table)"
                  : "Unavailable"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      )}

      {/* Spice Level Dialog */}
      <Dialog open={showSpiceDialog} onOpenChange={setShowSpiceDialog}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Customize Spice Level</DialogTitle>
            <DialogDescription>
              Select your preferred spice level for {spiceItem?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-4">
            {["Regular", "Mild", "Spicy", "Tangy"].map((level) => (
              <Button
                key={level}
                variant={selectedSpiceLevel === level ? "default" : "outline"}
                className={cn(
                  "w-full justify-start text-left h-12 text-base",
                  selectedSpiceLevel === level &&
                    "border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary"
                )}
                onClick={() => setSelectedSpiceLevel(level)}
              >
                <div className="flex items-center w-full">
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border border-primary mr-3 flex items-center justify-center",
                      selectedSpiceLevel === level
                        ? "bg-primary"
                        : "bg-transparent"
                    )}
                  >
                    {selectedSpiceLevel === level && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  {level}
                  <span className="ml-auto text-xs text-muted-foreground opacity-70">
                    {level === "Regular" && "Standard taste"}
                    {level === "Mild" && "Low spice"}
                    {level === "Spicy" && "Hot!"}
                    {level === "Tangy" && "Sour kick"}
                  </span>
                </div>
              </Button>
            ))}
          </div>
          <DialogFooter className="sm:justify-start">
            <Button
              type="button"
              className="w-full h-12 rounded-xl text-lg"
              onClick={confirmSpiceSelection}
            >
              Add to Cart - {selectedSpiceLevel}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-background">
          <p>Loading Menu...</p>
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}
