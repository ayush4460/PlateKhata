"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";
import {
  Search,
  ShoppingCart,
  UtensilsCrossed,
  Sparkles,
  Circle,
  Loader2,
  Minus,
  Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { BottomNav } from "@/components/layout/bottom-nav";
import type { MenuItem, Category } from "@/lib/types";
import { CategoryService } from "@/services/category.service";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { CustomizationSelectionDialog } from "@/components/customizations/customization-selection-dialog";

const normalizeBool = (val: any) =>
  val === true || val === "true" || Number(val) === 1;

interface MenuContentProps {
  disableTokenVerification?: boolean;
  enableCartWidget?: boolean;
  customTableId?: number; // Optional: If we want to force a specific table (Admin view)
  layoutMode?: "default" | "split";
  onAddToCart?: (
    item: MenuItem & { spiceLevel?: string; specialInstructions?: string },
  ) => void;
}

export function MenuContent({
  disableTokenVerification = false,
  enableCartWidget = true, // Default to true (Customer view)
  customTableId,
  layoutMode = "default",
  onAddToCart,
}: MenuContentProps) {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const {
    addToCart,
    cart,
    tableNumber,
    setTable,
    setRestaurantId,
    restaurantId: stateRestaurantId,
    setTableId,
    setRestaurantSlug,
    setTableToken,
    restaurantName,
    setMenuItems,
  } = useCart();
  const { toast } = useToast();

  const searchParams = useSearchParams();
  const restaurantId = searchParams.get("restaurantId");

  // Spice & Customization Dialog State
  const [showSpiceDialog, setShowSpiceDialog] = useState(false);
  const [showCustomizationDialog, setShowCustomizationDialog] = useState(false);
  const [dialogItem, setDialogItem] = useState<MenuItem | null>(null);
  const [selectedSpiceLevel, setSelectedSpiceLevel] = useState("Regular");

  const [dynamicCategories, setDynamicCategories] = useState<Category[]>([]);
  const [remoteMenuItems, setRemoteMenuItems] = useState<MenuItem[]>([]);
  const [isLoadingMenu, setIsLoadingMenu] = useState(true);

  const API_BASE = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
  ).replace(/\/$/, "");

  // --- TOKEN VERIFICATION (Only if allowed) ---
  useEffect(() => {
    if (disableTokenVerification) return;

    const tableQueryParam = searchParams.get("table");
    const tokenQueryParam = searchParams.get("token");

    // Memoize the verification logic to prevent loops
    // Only verify if we have a token and it's different from what we might have stored,
    // OR if we just loaded the page.
    // However, "setTableToken" might trigger re-renders.

    async function verifyToken() {
      // Prevent re-verification if token is already set in context (optional optimization)
      // But for now, we just fix the dependency array.
      if (tokenQueryParam) {
        try {
          console.log("[DEBUG] Verifying token:", tokenQueryParam);
          const res = await fetch(
            `${API_BASE}/public/tables/verify?token=${tokenQueryParam}`,
          );

          if (res.ok) {
            const data = await res.json();
            const payload = data.data || data;

            // Only update context if actually changed to avoid loop
            // But setTableToken might be stable. Check setTableToken implementation if needed.
            if (tokenQueryParam && setTableToken) {
              setTableToken(tokenQueryParam);
            }

            if (payload && payload.tableNumber) {
              const tableNum = String(payload.tableNumber);
              setTable(tableNum);

              if (payload.tableId && setTableId) {
                setTableId(String(payload.tableId));
              }

              if (payload.restaurantId && setRestaurantId) {
                setRestaurantId(String(payload.restaurantId));
              }
              return;
            }
          }
          // Invalid token / Verification failed
          setTable(null);
        } catch (e) {
          console.error("Token verification failed", e);
          setTable(null);
        }
      } else if (tableQueryParam) {
        console.warn("Manual table entry rejected. Scan QR code.");
        setTable(null);
      } else {
        setTable(null);
      }
    }

    verifyToken();
  }, [
    // CRITICAL FIX: Do NOT include 'searchParams' here.
    // It changes on every render => Infinite Loop.
    // Depend on the specific values instead.
    searchParams.get("token"),
    searchParams.get("table"),
    setTable,
    API_BASE,
    disableTokenVerification,
    setTableId,
    setRestaurantId,
    setTableToken,
  ]);

  const params = useParams();
  const slug = params?.slug as string;

  // Resolve slug to restaurantId
  useEffect(() => {
    async function resolveRestaurant() {
      // If we provided a custom table ID or are in admin view, we might already have the restaurantId in context
      // But if we have a slug, we should try to resolve it.
      if (!slug) return;

      try {
        console.log(`[Menu] Fetching restaurant by slug: ${slug}`);
        const response = await fetch(`${API_BASE}/public/restaurants/${slug}`);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.data) {
            const rId = data.data.restaurantId || data.data.id;
            // Only set if not already set or if different?
            // Better to trust the slug if present.
            setRestaurantId(String(rId));

            if (slug && setRestaurantSlug) {
              setRestaurantSlug(slug);
            }
          }
        }
      } catch (err) {
        console.error("Failed to resolve restaurant slug", err);
      }
    }

    resolveRestaurant();
  }, [slug, API_BASE, setRestaurantId, setRestaurantSlug]);

  useEffect(() => {
    // Fallback: If restaurantId query param is present
    if (restaurantId) {
      setRestaurantId(restaurantId);
    }
  }, [restaurantId, setRestaurantId]);

  // Fetch menu items
  useEffect(() => {
    let cancelled = false;

    async function fetchMenu() {
      const targetId = stateRestaurantId || restaurantId;

      if (slug && !targetId) return;

      if (targetId === "undefined" || targetId === "null") {
        setIsLoadingMenu(false);
        return;
      }

      setIsLoadingMenu(true);
      try {
        const query = targetId ? `?restaurantId=${targetId}` : "";
        const url = `${API_BASE}/menu${query}`;

        const res = await fetch(url, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        let raw: any = null;
        try {
          raw = await res.json();
        } catch (err) {
          raw = null;
        }

        if (!res.ok) {
          setRemoteMenuItems([]);
          return;
        }

        let arr: any[] = [];
        if (Array.isArray(raw)) arr = raw;
        else if (Array.isArray(raw?.data)) arr = raw.data;
        else if (Array.isArray(raw?.items)) arr = raw.items;
        else {
          const firstArray = Object.values(raw || {}).find((v) =>
            Array.isArray(v),
          );
          if (Array.isArray(firstArray)) arr = firstArray as any[];
        }

        const mapped: MenuItem[] = (arr || []).map((o: any, idx: number) => {
          const id = String(
            o.item_id ?? o.id ?? o.itemId ?? `menu-${Date.now()}-${idx}`,
          );
          const imageRaw = o.image_url ?? o.imageUrl ?? o.image?.url ?? o.image;
          const imageUrl = !imageRaw
            ? "https://placehold.co/300x300"
            : String(imageRaw).startsWith("http")
              ? String(imageRaw)
              : `${API_BASE}${
                  String(imageRaw).startsWith("/") ? "" : "/"
                }${String(imageRaw)}`;

          const isVegetarian =
            o.is_vegetarian === true ||
            o.is_vegetarian === "true" ||
            Number(o.is_vegetarian) === 1;

          return {
            id,
            name: String(o.name ?? "Unnamed"),
            description: String(o.description ?? ""),
            price: Number(parseFloat(String(o.price ?? "0")) || 0),
            category: String(o.category ?? "Uncategorized"),
            image: { url: imageUrl, hint: "" },
            isAvailable: normalizeBool(o.is_available),
            isVegetarian,
            dietaryType:
              o.dietary_type ||
              o.dietaryType ||
              (isVegetarian ? "veg" : "non_veg"),
            preparationTime: o.preparation_time ?? o.preparationTime ?? null,
            hasSpiceLevels: normalizeBool(
              o.has_spice_levels ?? o.hasSpiceLevels,
            ),
            customizationNames:
              o.customizationNames ||
              o.customization_names ||
              (o.customization_details
                ? o.customization_details.map((d: any) => d.group_name)
                : []),
            customizationDetails: o.customization_details || [],
          } as MenuItem;
        });

        if (!cancelled) {
          setRemoteMenuItems(mapped);
          // Sync to Context so TableDetails can see it
          if (setMenuItems) {
            setMenuItems(mapped);
          }
        }
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

  // Track loading state per item
  const [addingItems, setAddingItems] = useState<Record<string, boolean>>({});
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>(
    {},
  );

  const getQty = (itemId: string) => itemQuantities[itemId] || 1;

  const handleIncrement = (itemId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setItemQuantities((prev) => ({
      ...prev,
      [itemId]: (prev[itemId] || 1) + 1,
    }));
  };

  const handleDecrement = (itemId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setItemQuantities((prev) => {
      const current = prev[itemId] || 1;
      if (current <= 1) return prev;
      return { ...prev, [itemId]: current - 1 };
    });
  };

  const handleAddToCart = async (item: MenuItem, e?: React.MouseEvent) => {
    e?.stopPropagation();

    // Check for Customizations first
    if (
      (item.customizationNames && item.customizationNames.length > 0) ||
      (item.customizationDetails && item.customizationDetails.length > 0)
    ) {
      setDialogItem(item);
      setShowCustomizationDialog(true);
      return;
    }

    if (item.hasSpiceLevels) {
      setDialogItem(item);
      setSelectedSpiceLevel("Regular");
      setShowSpiceDialog(true);
    } else {
      const quantityToAdd = getQty(item.id);

      // Create a temporary item with the correct quantity
      // Note: We might need to handle this differently depending on onAddToCart signature
      // but usually addToCart logic sums quantities for same ID.
      // If we are passing to `addToCart(item)`, we might need to loop or update `useCart` to accept qty.
      // Assuming `addToCart` adds 1 by default, let's check `useCart`.
      // Actually `onAddToCart` usually takes an item.
      // Let's modify the item being passed to have the quantity?
      // Or just call it N times? Calling N times is safer if backend logic is complex,
      // but modifying quantity property is better if supported.
      // Looking at `use-cart.tsx` (from memory/previous context), `addToCart` usually increments.
      // BUT `handleInstantAdd` in `table-details.tsx` hardcodes quantity: 1.
      // Wait, `handleInstantAdd` was used in `menu-content` prop `onAddToCart`.
      // I need to update `handleInstantAdd` in `TableDetails` to accept quantity too?
      // `handleInstantAdd` takes `item`.
      // Let's modify `handleInstantAdd` in `TableDetails` conceptually by passing an item with `quantity` property if possible,
      // OR update the `handleInstantAdd` signature.
      // Since I can't easily change `TableDetails` signature right here without another tool call,
      // I will hack it: strictly speaking `MenuItem` interface usually has generic props.
      // actually `handleInstantAdd` constructs payload: `quantity: 1`.
      // I should update `handleInstantAdd` in `table-details` to read `item.quantity` if present.

      // For now, let's pass a modified item object that includes `quantity`.
      const itemWithQty = { ...item, quantity: quantityToAdd };

      if (onAddToCart) {
        setAddingItems((prev) => ({ ...prev, [item.id]: true }));
        try {
          await onAddToCart(itemWithQty);
          // Only reset if successful
          setItemQuantities((prev) => ({ ...prev, [item.id]: 1 }));
        } catch (error) {
          console.error("Failed to add item", error);
        } finally {
          setAddingItems((prev) => ({ ...prev, [item.id]: false }));
        }
      } else {
        // Default context add (Customer view)
        // ensure addToCart handles custom quantity
        for (let i = 0; i < quantityToAdd; i++) {
          addToCart(item);
        }
        setItemQuantities((prev) => ({ ...prev, [item.id]: 1 }));

        toast({
          title: "Added to selection",
          description: `${quantityToAdd}x ${item.name} added.`,
          duration: 1500,
        });
      }
    }
  };

  const handleCustomizationConfirm = (
    item: MenuItem,
    selectedOptions: any[],
  ) => {
    const quantityToAdd = getQty(item.id);

    const itemToAdd = {
      ...item,
      customizations: selectedOptions,
      quantity: quantityToAdd,
    };

    if (onAddToCart) {
      onAddToCart(itemToAdd);
    } else {
      for (let i = 0; i < quantityToAdd; i++) {
        addToCart(itemToAdd);
      }
    }
    setItemQuantities((prev) => ({ ...prev, [item.id]: 1 }));
  };

  const confirmSpiceSelection = () => {
    if (dialogItem) {
      const itemToAdd = {
        ...dialogItem,
        spiceLevel: selectedSpiceLevel,
      } as any;
      if (onAddToCart) {
        onAddToCart(itemToAdd);
      } else {
        addToCart(itemToAdd);
      }
      setShowSpiceDialog(false);
      setDialogItem(null);
    }
  };

  const filteredMenu = remoteMenuItems.filter((item) => {
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

  // Effective Table Number: If provided via props (Admin) or from Context (Customer)
  const effectiveTableNumber = disableTokenVerification
    ? customTableId
      ? String(customTableId)
      : tableNumber
    : tableNumber;

  // Is Allowed to Add:
  // - If Token Verification is DISABLED (Admin Mode), allow adding.
  // - If ENABLED (Customer Mode), strict check for tableNumber.
  const canAdd = disableTokenVerification || !!effectiveTableNumber;

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
      <div className="flex items-center justify-center h-full min-h-[50vh] bg-background">
        <p>Loading Menu...</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "bg-background",
        layoutMode === "split" ? "h-full flex flex-col" : "min-h-screen",
        enableCartWidget && layoutMode !== "split"
          ? "pb-24"
          : layoutMode !== "split"
            ? "pb-4"
            : "",
      )}
    >
      <header className="sticky top-0 bg-background/80 backdrop-blur-sm z-10 p-4 space-y-4 border-b">
        {layoutMode !== "split" && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-lg">
              <UtensilsCrossed className="h-6 w-6 text-primary" />
              <span className="font-headline">
                {restaurantName || "MunchMate"}{" "}
                {effectiveTableNumber && `- Table ${effectiveTableNumber}`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              {enableCartWidget && (
                <Link href="/cart" className="relative hidden md:block">
                  <ShoppingCart className="h-6 w-6 text-foreground" />
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-2 -right-3 h-5 w-5 flex items-center justify-center p-0">
                      {cartItemCount}
                    </Badge>
                  )}
                </Link>
              )}
            </div>
          </div>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="What are you craving?"
            className="pl-10 h-12 w-full rounded-full bg-muted border-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            disabled={!canAdd && !disableTokenVerification}
          />
        </div>
      </header>

      {/* Customization Dialog */}
      <CustomizationSelectionDialog
        open={showCustomizationDialog}
        onOpenChange={setShowCustomizationDialog}
        item={dialogItem}
        onConfirm={handleCustomizationConfirm}
      />

      <main
        className={cn(
          "flex-1 flex flex-col min-h-0",
          layoutMode === "default" && "p-4",
        )}
      >
        {!canAdd && renderNoTableWarning()}

        {layoutMode === "split" ? (
          <div className="flex flex-1 overflow-hidden border-t min-h-0">
            {/* Categories */}
            <div className="w-1/4 min-w-[200px] border-r bg-background flex flex-col overflow-hidden">
              <div className="p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wider bg-background border-b flex-shrink-0">
                Categories
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <div className="flex flex-col p-2 space-y-1">
                  <Button
                    variant={selectedCategory === "all" ? "secondary" : "ghost"}
                    className={cn(
                      "justify-start font-normal",
                      selectedCategory === "all" &&
                        "bg-accent shadow-sm font-medium",
                    )}
                    onClick={() => setSelectedCategory("all")}
                  >
                    <UtensilsCrossed className="mr-2 h-4 w-4" />
                    All Items
                  </Button>
                  {dynamicCategories.map((category) => (
                    <Button
                      key={category.id}
                      variant={
                        selectedCategory === category.name.toLowerCase()
                          ? "secondary"
                          : "ghost"
                      }
                      className={cn(
                        "justify-start font-normal",
                        selectedCategory === category.name.toLowerCase() &&
                          "bg-accent shadow-sm font-medium",
                      )}
                      onClick={() =>
                        setSelectedCategory(category.name.toLowerCase())
                      }
                    >
                      <UtensilsCrossed className="mr-2 h-4 w-4 opacity-50" />
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="flex-1 flex flex-col bg-background">
              <div className="p-4 font-semibold text-xs text-muted-foreground uppercase tracking-wider border-b bg-background flex justify-between items-center">
                <span>Menu Items</span>
                <Badge variant="secondary">{filteredMenu.length} found</Badge>
              </div>
              <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                  {filteredMenu.map((item) => (
                    <Card
                      key={item.id}
                      className={cn(
                        "overflow-hidden rounded-xl shadow-sm transition-all hover:shadow-md hover:-translate-y-1 bg-background",
                        !item.isAvailable && "opacity-60",
                        layoutMode !== "split" && "cursor-pointer",
                      )}
                      onClick={
                        layoutMode === "split"
                          ? undefined
                          : () => setSelectedItem(item)
                      }
                    >
                      <CardContent className="p-0">
                        <div className="p-3 space-y-2">
                          <div className="flex justify-between items-start gap-2">
                            <h3 className="font-medium text-sm leading-tight line-clamp-2 flex-1">
                              {item.name}
                            </h3>
                            <div className="flex flex-col items-end">
                              <span className="font-bold text-sm whitespace-nowrap flex-shrink-0">
                                {item.customizationDetails &&
                                item.customizationDetails.length > 0 &&
                                item.customizationDetails[0].options.length > 0
                                  ? (() => {
                                      // Get options from the first group (assuming it's the primary variant)
                                      const primaryOptions =
                                        item.customizationDetails[0].options;
                                      // Sort by price
                                      const sortedPrices = primaryOptions
                                        .map(
                                          (o) => item.price + o.priceModifier,
                                        )
                                        .sort((a, b) => a - b);

                                      // If all prices are the same, show one
                                      if (
                                        sortedPrices[0] ===
                                        sortedPrices[sortedPrices.length - 1]
                                      ) {
                                        return `₹${sortedPrices[0].toFixed(0)}`;
                                      }

                                      // Format as "₹20/₹40" if 2 options, or range if more?
                                      // User requested "rs20/rs40" specifically.
                                      if (primaryOptions.length <= 2) {
                                        return sortedPrices
                                          .map((p) => `₹${p.toFixed(0)}`)
                                          .join("/");
                                      }

                                      // Otherwise show range "₹20 - ₹40" or "From ₹20"
                                      return `₹${sortedPrices[0].toFixed(
                                        0,
                                      )} - ₹${sortedPrices[
                                        sortedPrices.length - 1
                                      ].toFixed(0)}`;
                                    })()
                                  : `₹${item.price.toFixed(2)}`}
                              </span>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2 h-8">
                            {item.description}
                          </p>

                          {/* Compact Customization Display */}
                          {item.customizationDetails &&
                          item.customizationDetails.length > 0 ? (
                            <div className="pt-1">
                              {item.customizationDetails.map((group, idx) => (
                                <div
                                  key={idx}
                                  className="text-[10px] font-medium text-muted-foreground/80 leading-tight flex items-center gap-1"
                                >
                                  {/* User requested to only show names like "Cutting/Full" without the group label prefix */}
                                  <span>
                                    {group.options
                                      .map((opt) => opt.name)
                                      .join("/")}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          <div className="flex items-center gap-2 w-full pt-2">
                            {/* Quantity Selector */}
                            <div
                              className="flex items-center border rounded-full h-7 px-1 shadow-sm bg-background transition-colors hover:border-primary/50"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 rounded-full p-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
                                onClick={(e) => handleDecrement(item.id, e)}
                                disabled={
                                  getQty(item.id) <= 1 ||
                                  !item.isAvailable ||
                                  !canAdd
                                }
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-5 text-center text-xs font-medium">
                                {getQty(item.id)}
                              </span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-5 w-5 rounded-full p-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
                                onClick={(e) => handleIncrement(item.id, e)}
                                disabled={!item.isAvailable || !canAdd}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>

                            <Button
                              size="sm"
                              className="flex-1 h-7 rounded-full shadow-sm font-medium px-2 text-xs"
                              onClick={(e) => handleAddToCart(item, e)}
                              disabled={
                                !item.isAvailable ||
                                !canAdd ||
                                addingItems[item.id]
                              }
                            >
                              {addingItems[item.id] ? (
                                <span className="flex items-center gap-1">
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                  ...
                                </span>
                              ) : (
                                "Add"
                              )}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="pb-4">
              <div className="flex space-x-2 overflow-x-auto pb-2 -mx-4 px-4">
                <Button
                  variant={selectedCategory === "all" ? "default" : "outline"}
                  className={cn(
                    "rounded-full whitespace-nowrap flex items-center gap-2",
                    selectedCategory === "all"
                      ? "bg-primary text-primary-foreground"
                      : "bg-card",
                  )}
                  onClick={() => setSelectedCategory("all")}
                >
                  All
                </Button>
                {dynamicCategories.map((category) => (
                  <Button
                    key={category.id}
                    variant={
                      selectedCategory === category.name.toLowerCase()
                        ? "default"
                        : "outline"
                    }
                    className={cn(
                      "rounded-full whitespace-nowrap flex items-center gap-2",
                      selectedCategory === category.name.toLowerCase()
                        ? "bg-primary text-primary-foreground"
                        : "bg-card",
                    )}
                    onClick={() =>
                      setSelectedCategory(category.name.toLowerCase())
                    }
                  >
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
                    !item.isAvailable && "opacity-60",
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

                      {/* Dietary Badge */}
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
                      <div className="flex justify-between items-center gap-2">
                        <h3 className="font-semibold text-sm truncate flex-1">
                          {item.name}
                        </h3>
                        <span className="font-bold text-sm">
                          ₹{item.price.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 h-8 flex-grow">
                        {item.description}
                      </p>
                      <div className="flex items-center gap-2 w-full pt-2">
                        {/* Quantity Selector */}
                        <div
                          className="flex items-center border rounded-full h-8 px-1 shadow-sm bg-background transition-colors hover:border-primary/50"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full p-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
                            onClick={(e) => handleDecrement(item.id, e)}
                            disabled={
                              getQty(item.id) <= 1 ||
                              !item.isAvailable ||
                              !canAdd
                            }
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium">
                            {getQty(item.id)}
                          </span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 rounded-full p-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
                            onClick={(e) => handleIncrement(item.id, e)}
                            disabled={!item.isAvailable || !canAdd}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>

                        <Button
                          size="sm"
                          className="flex-1 h-8 rounded-full shadow-sm font-medium px-2"
                          onClick={(e) => handleAddToCart(item, e)}
                          disabled={
                            !item.isAvailable || !canAdd || addingItems[item.id]
                          }
                        >
                          {addingItems[item.id] ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            "Add"
                          )}
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

      {/* Item Details Sheet */}
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
            <div className="flex items-center justify-between pb-4">
              {/* Quantity Control for Details Pane */}
              <div className="flex items-center border rounded-full h-10 px-2 shadow-sm bg-background transition-colors hover:border-primary/50">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
                  onClick={(e) => handleDecrement(selectedItem.id, e)}
                  disabled={
                    getQty(selectedItem.id) <= 1 ||
                    !selectedItem.isAvailable ||
                    !canAdd
                  }
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="text-lg font-bold w-10 text-center">
                  {getQty(selectedItem.id)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full p-0 text-muted-foreground hover:text-foreground hover:bg-transparent"
                  onClick={(e) => handleIncrement(selectedItem.id, e)}
                  disabled={!selectedItem.isAvailable || !canAdd}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-primary">
                  ₹{(selectedItem.price * getQty(selectedItem.id)).toFixed(2)}
                </p>
              </div>
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
                disabled={
                  !selectedItem.isAvailable ||
                  !canAdd ||
                  addingItems[selectedItem.id]
                }
              >
                {addingItems[selectedItem.id] ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding to Cart...
                  </>
                ) : selectedItem.isAvailable ? (
                  canAdd ? (
                    "Add to Cart"
                  ) : (
                    "View Only (No Table)"
                  )
                ) : (
                  "Unavailable"
                )}
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
              Select your preferred spice level for {dialogItem?.name}
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
                    "border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:text-primary",
                )}
                onClick={() => setSelectedSpiceLevel(level)}
              >
                <div className="flex items-center w-full">
                  <div
                    className={cn(
                      "w-4 h-4 rounded-full border border-primary mr-3 flex items-center justify-center",
                      selectedSpiceLevel === level
                        ? "bg-primary"
                        : "bg-transparent",
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

      {enableCartWidget && <BottomNav />}
    </div>
  );
}
