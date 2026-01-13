// src/app/dashboard/menu-editor/page.tsx
"use client";

import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Trash2, Edit, PlusCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MenuItem } from "@/lib/types";
import Image from "next/image";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth";
import { CategoryService } from "@/services/category.service";
import { Category } from "@/lib/types";
import { MenuItemCustomizationManager } from "@/components/customizations/menu-item-customization-manager";
import { CustomizationSelector } from "@/components/customizations/customization-selector";

// Helper function to correctly parse boolean values from DB
const normalizeBool = (val: any) =>
  val === true || val === "true" || Number(val) === 1;

// --- CATEGORY LIST (Removed static list) ---

export default function MenuEditorPage() {
  // --- MODIFIED: Destructure discountRate and updateSettings ---
  const {
    taxRate,
    discountRate,
    upiId,
    updateSettings,
    menuItems: initialMenuItemsFromHook,
    setMenuItems: setGlobalMenuItems,
  } = useCart();

  const [categories, setCategories] = useState<Category[]>([]);
  const [localMenuItems, setLocalMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [localTaxRate, setLocalTaxRate] = useState("");
  const [localDiscountRate, setLocalDiscountRate] = useState("");
  const [localUpiId, setLocalUpiId] = useState("");
  const [isEditing, setIsEditing] = useState<MenuItem | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editedItem, setEditedItem] = useState<
    Partial<MenuItem> & { imageFile?: File | null }
  >({});
  const { toast } = useToast();
  const { adminUser } = useAuth();

  // Customization State for Creation
  const [pendingCustomizations, setPendingCustomizations] = useState<any[]>([]);

  const API_BASE = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
  ).replace(/\/$/, "");
  const authHeaders = (): Record<string, string> => {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // --- MODIFIED: Sync both Tax and Discount ---
  useEffect(() => {
    setLocalTaxRate((taxRate * 100).toFixed(0));
    setLocalDiscountRate((discountRate * 100).toFixed(0));
    setLocalUpiId(upiId || "");
  }, [taxRate, discountRate, upiId]);

  // Fetch Categories
  useEffect(() => {
    if (adminUser?.restaurantId) {
      CategoryService.getAll(Number(adminUser.restaurantId))
        .then(setCategories)
        .catch((err) => console.error("Failed to fetch categories", err));
    }
  }, [adminUser]);

  // Fetch menu items from backend
  useEffect(() => {
    let cancelled = false;
    async function fetchMenu() {
      setLoading(true);
      console.log("[Menu Editor] Fetching menu...");
      try {
        const query = adminUser?.restaurantId
          ? `?restaurantId=${adminUser.restaurantId}`
          : "";
        const res = await fetch(`${API_BASE}/menu${query}`, {
          headers: { ...authHeaders() },
        });
        console.log("[Menu Editor] Fetch menu status:", res.status);
        if (!res.ok) {
          const errText = await res.text();
          console.error(errText);
          throw new Error(`Failed to fetch menu (${res.status})`);
        }
        const data = await res.json();
        const arr = Array.isArray(data)
          ? data
          : data?.items ?? data?.data ?? [];
        const mapped: MenuItem[] = arr.map((o: any) => ({
          id: String(o.item_id ?? o.id ?? o.itemId ?? o._id ?? ""),
          name: o.name ?? "Unnamed",
          description: o.description ?? "",
          price: Number(o.price ?? 0),
          category: o.category ?? "Uncategorized",
          categoryId: o.category_id, // Map from backend
          image: {
            url: (() => {
              const u = o.image_url ?? o.imageUrl ?? o.image?.url ?? o.image;
              if (!u) return "https://placehold.co/300x300";
              if (u.startsWith("http")) return u;
              return `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
            })(),
            hint: "",
          },
          imageId: o.imageId ?? "",
          isAvailable: normalizeBool(o.is_available ?? o.isAvailable),
          isVegetarian: normalizeBool(o.is_vegetarian ?? o.isVegetarian),
          dietaryType:
            o.dietary_type ||
            o.dietaryType ||
            (normalizeBool(o.is_vegetarian ?? o.isVegetarian)
              ? "veg"
              : "non_veg"),
          preparationTime: o.preparation_time ?? o.preparationTime ?? null,
          hasSpiceLevels: normalizeBool(o.has_spice_levels ?? o.hasSpiceLevels),
          customizationNames: o.customization_names ?? [], // Map from backend
        }));
        if (!cancelled) {
          setLocalMenuItems(mapped);
          console.log("[Menu Editor] Menu items loaded:", mapped.length);
        }
      } catch (err) {
        console.error("Error fetching menu items:", err);
        toast({
          variant: "destructive",
          title: "Failed to load menu",
          description: (err as Error).message,
        });
        if (!cancelled) setLocalMenuItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchMenu();
    return () => {
      cancelled = true;
    };
  }, [API_BASE, toast]);

  // --- MODIFIED: Handle Settings Save (Tax & Discount) ---
  const handleSaveSettings = async () => {
    const newTaxPercent = parseFloat(localTaxRate);
    const newDiscountPercent = parseFloat(localDiscountRate);
    const trimmedUpi = localUpiId.trim();

    if (isNaN(newTaxPercent) || newTaxPercent < 0 || newTaxPercent > 50) {
      toast({
        variant: "destructive",
        title: "Invalid Tax Rate",
        description: "Enter % between 0-50.",
      });
      return;
    }
    if (
      isNaN(newDiscountPercent) ||
      newDiscountPercent < 0 ||
      newDiscountPercent > 100
    ) {
      toast({
        variant: "destructive",
        title: "Invalid Discount",
        description: "Enter % between 0-100.",
      });
      return;
    }
    if (!trimmedUpi) {
      toast({
        variant: "destructive",
        title: "UPI ID required",
        description: "Please enter a UPI ID like name@bank.",
      });
      return;
    }
    const upiRegex = /^[A-Za-z0-9.\-_]+@[A-Za-z0-9.\-_]+$/;
    if (!upiRegex.test(trimmedUpi)) {
      toast({
        variant: "destructive",
        title: "Invalid UPI ID",
        description: "Use a valid format like platekhata@bank or 2523553@bank.",
      });
      return;
    }

    try {
      await updateSettings(
        newTaxPercent / 100,
        newDiscountPercent / 100,
        trimmedUpi
      );
      toast({
        title: "Settings Saved",
        description: `Tax: ${newTaxPercent.toFixed(
          2
        )}%, Discount: ${newDiscountPercent.toFixed(2)}%, UPI: ${trimmedUpi}`,
      });
    } catch (error) {
      /* Error handled in hook */
    }
  };

  const handleEditClick = (item: MenuItem) => {
    setIsEditing(item);
    setIsCreating(false);
    setEditedItem({ ...item, imageFile: null });
  };

  const handleCreateClick = () => {
    setIsCreating(true);
    setIsEditing(null);
    setEditedItem({
      name: "",
      description: "",
      price: 0,
      category: "",
      image: { url: "https://placehold.co/300x300", hint: "" },
      isAvailable: true,
      isVegetarian: false,
      hasSpiceLevels: false, // Added
      preparationTime: 10,
      imageFile: null,
    });
    setPendingCustomizations([]);
  };

  const handleDelete = async (itemId: string | number | undefined) => {
    if (!itemId) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Invalid item id.",
      });
      return;
    }
    const numericId = Number(itemId);
    if (isNaN(numericId)) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: "Invalid item id format.",
      });
      return;
    }
    if (!confirm("Delete this menu item?")) return;
    try {
      const res = await fetch(`${API_BASE}/menu/${numericId}`, {
        method: "DELETE",
        headers: { ...authHeaders() },
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Status ${res.status}`);
      }
      setLocalMenuItems((currentItems) =>
        currentItems.filter((it) => it.id !== String(numericId))
      );
      toast({ title: "Item Deleted" });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Delete failed",
        description: (err as Error).message,
      });
    }
  };

  const handleSave = async () => {
    if (!editedItem.name?.trim()) {
      toast({
        variant: "destructive",
        title: "Validation",
        description: "Name required.",
      });
      return;
    }
    if (
      typeof editedItem.price !== "number" ||
      isNaN(editedItem.price) ||
      editedItem.price < 0
    ) {
      toast({
        variant: "destructive",
        title: "Validation",
        description: "Valid price required.",
      });
      return;
    }

    // Category Validation
    if (!editedItem.category || editedItem.category.trim() === "") {
      toast({
        variant: "destructive",
        title: "Validation",
        description: "Category is required.",
      });
      return;
    }

    const form = new FormData();
    form.append("name", String(editedItem.name));
    form.append("description", String(editedItem.description ?? ""));
    form.append("price", String(editedItem.price));
    // form.append('category', String(editedItem.category)); // Legacy string
    if (editedItem.categoryId)
      form.append("categoryId", String(editedItem.categoryId)); // Dynamic ID

    // Send dietaryType (Backend handles sync with isVegetarian)
    form.append(
      "dietaryType",
      editedItem.dietaryType || (editedItem.isVegetarian ? "veg" : "non_veg")
    );
    form.append("isVegetarian", String(editedItem.dietaryType === "veg"));

    if (editedItem.preparationTime != null)
      form.append("preparationTime", String(editedItem.preparationTime));
    form.append("isAvailable", String(editedItem.isAvailable ?? true));
    form.append("hasSpiceLevels", String(editedItem.hasSpiceLevels ?? false)); // Added

    // Add Customizations JSON for creation
    if (isCreating && pendingCustomizations.length > 0) {
      form.append(
        "customizationAssignments",
        JSON.stringify(pendingCustomizations)
      );
    }

    if (editedItem.imageFile) {
      form.append("image", editedItem.imageFile);
    }

    const isUpdating = isEditing && isEditing.id;
    const url = isUpdating
      ? `${API_BASE}/menu/${isEditing.id}`
      : `${API_BASE}/menu`;
    const method = isUpdating ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { ...authHeaders() },
        body: form,
      });
      if (!res.ok) {
        const txt = await res.text().catch(() => "");
        throw new Error(txt || `Save failed (Status ${res.status})`);
      }
      const json = await res.json();
      const o = json?.item ?? json?.data ?? json;

      const savedItem: MenuItem = {
        id: String(
          o.item_id ??
            o.id ??
            o.itemId ??
            o._id ??
            (isUpdating ? isEditing.id : `temp-${Date.now()}`)
        ),
        name: o.name ?? "Unnamed",
        description: o.description ?? "",
        price: Number(o.price ?? 0),
        category: (() => {
          if (o.category_name) return o.category_name;
          if (o.category) return o.category;
          // Fallback: look up in local categories
          const catId = o.category_id ?? editedItem.categoryId;
          const found = categories.find((c) => Number(c.id) === Number(catId));
          return found ? found.name : "Uncategorized";
        })(),
        image: {
          url: (() => {
            const u = o.image_url ?? o.imageUrl ?? o.image?.url ?? o.image;
            if (!u)
              return editedItem.image?.url || "https://placehold.co/300x300";
            if (u.startsWith("http")) return u;
            return `${API_BASE}${u.startsWith("/") ? "" : "/"}${u}`;
          })(),
          hint: "",
        },
        imageId: o.imageId ?? editedItem.imageId ?? "",
        isAvailable: normalizeBool(o.is_available ?? o.isAvailable),
        isVegetarian: normalizeBool(o.is_vegetarian ?? o.isVegetarian),
        preparationTime: o.preparation_time ?? o.preparationTime ?? null,
        hasSpiceLevels: normalizeBool(o.has_spice_levels ?? o.hasSpiceLevels), // Added
      };

      if (isUpdating) {
        setLocalMenuItems((current) =>
          current.map((it) => (it.id === savedItem.id ? savedItem : it))
        );
      } else {
        setLocalMenuItems((current) => [...current, savedItem]);
      }

      toast({ title: isUpdating ? "Item Updated" : "Item Created" });
      setIsEditing(null);
      setIsCreating(false);
      setEditedItem({});
    } catch (err: any) {
      console.error("Save menu item failed", err);
      toast({
        variant: "destructive",
        title: "Save failed",
        description: err?.message || "Could not save menu item.",
      });
    }
  };

  const handleToggle = async (itemId: string, field: "isAvailable") => {
    const item = localMenuItems.find((it) => it.id === itemId);
    if (!item) return;
    const currentValue = item[field];
    const newValue = !currentValue;

    setLocalMenuItems((s) =>
      s.map((it) => (it.id === itemId ? { ...it, [field]: newValue } : it))
    );

    try {
      const res = await fetch(`${API_BASE}/menu/${itemId}/availability`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...authHeaders() },
      });
      if (!res.ok) throw new Error("Failed to toggle availability");
      const json = await res.json();
      const o = json?.item ?? json?.data ?? json;
      const serverValue = normalizeBool(o[field] ?? o["is_available"]);
      setLocalMenuItems((s) =>
        s.map((it) => (it.id === itemId ? { ...it, [field]: serverValue } : it))
      );
      toast({ title: "Availability updated" });
    } catch (err) {
      console.error("Toggle availability failed", err);
      toast({
        variant: "destructive",
        title: "Update failed",
        description: (err as Error).message,
      });
      setLocalMenuItems((s) =>
        s.map((it) =>
          it.id === itemId ? { ...it, [field]: currentValue } : it
        )
      );
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditedItem((prev) => ({
          ...prev,
          image: { url: reader.result as string, hint: "local-preview" },
          imageFile: file,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const renderEditDialog = () => (
    <Dialog
      open={!!isEditing || isCreating}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          setIsEditing(null);
          setIsCreating(false);
          setEditedItem({});
        }
      }}
    >
      <DialogContent className="sm:max-w-[425px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Edit Menu Item" : "Create New Item"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Name */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={editedItem.name || ""}
              onChange={(e) =>
                setEditedItem({ ...editedItem, name: e.target.value })
              }
              className="col-span-3"
              required
            />
          </div>
          {/* Description */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right">
              Description
            </Label>
            <Input
              id="description"
              value={editedItem.description || ""}
              onChange={(e) =>
                setEditedItem({ ...editedItem, description: e.target.value })
              }
              className="col-span-3"
            />
          </div>
          {/* Price */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="price" className="text-right">
              Price (₹)
            </Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={editedItem.price ?? ""}
              onChange={(e) =>
                setEditedItem({
                  ...editedItem,
                  price: parseFloat(e.target.value) || 0,
                })
              }
              className="col-span-3"
              required
            />
          </div>

          {/* Category Select */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right">
              Category
            </Label>
            <Select
              value={editedItem.categoryId ? String(editedItem.categoryId) : ""}
              onValueChange={(val) => {
                console.log("Selected value:", val);
                // Compare strings directly since Select values are strings
                const cat = categories.find((c) => String(c.id) === val);
                console.log("Found category:", cat);
                if (cat) {
                  const numId = Number(cat.id);
                  setEditedItem((prev) => {
                    console.log("Updating editedItem with catId:", numId);
                    return {
                      ...prev,
                      categoryId: numId,
                      category: cat.name,
                    };
                  });
                }
              }}
            >
              <SelectTrigger id="category" className="col-span-3">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prep Time */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="preptime" className="text-right">
              Prep Time (min)
            </Label>
            <Input
              id="preptime"
              type="number"
              value={editedItem.preparationTime ?? ""}
              onChange={(e) =>
                setEditedItem({
                  ...editedItem,
                  preparationTime: parseInt(e.target.value || "0", 10) || null,
                })
              }
              className="col-span-3"
              placeholder="Optional"
            />
          </div>
          {/* Dietary Type Select */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dietaryType" className="text-right">
              Dietary Type
            </Label>
            <Select
              value={
                editedItem.dietaryType ||
                (editedItem.isVegetarian ? "veg" : "non_veg")
              }
              onValueChange={(val: "veg" | "non_veg" | "eggitarian") =>
                setEditedItem({
                  ...editedItem,
                  dietaryType: val,
                  isVegetarian: val === "veg",
                })
              }
            >
              <SelectTrigger id="dietaryType" className="col-span-3">
                <SelectValue placeholder="Select dietary type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="veg">Vegetarian (Green)</SelectItem>
                <SelectItem value="non_veg">Non-Vegetarian (Red)</SelectItem>
                <SelectItem value="eggitarian">Eggitarian (Yellow)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Available Toggle */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="isAvailable" className="text-right">
              Available
            </Label>
            <div className="col-span-3 flex items-center">
              <Switch
                id="isAvailable"
                checked={editedItem.isAvailable ?? true}
                onCheckedChange={(v) =>
                  setEditedItem({ ...editedItem, isAvailable: !!v })
                }
              />
            </div>
          </div>
          {/* Image Upload */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="image" className="text-right">
              Image
            </Label>
            <Input
              id="image"
              type="file"
              onChange={handleImageChange}
              className="col-span-3"
              accept="image/png, image/jpeg, image/webp"
            />
          </div>
          {/* Image Preview */}
          {editedItem.image?.url && (
            <div className="grid grid-cols-4 items-center gap-4">
              <div className="col-start-2 col-span-3">
                <p className="text-sm font-medium mb-2">Image Preview:</p>
                <Image
                  src={editedItem.image.url}
                  alt="Preview"
                  width={100}
                  height={100}
                  className="rounded-md object-cover aspect-square"
                  unoptimized
                />
              </div>
            </div>
          )}
        </div>

        {/* Customization Manager (Only for existing items) */}
        {isEditing && isEditing.id && adminUser?.restaurantId && (
          <MenuItemCustomizationManager
            itemId={Number(isEditing.id)}
            restaurantId={Number(adminUser.restaurantId)}
          />
        )}

        {/* Customization Selector (Only for Creation) */}
        {isCreating && adminUser?.restaurantId && (
          <div className="border-t pt-4 mt-4">
            <CustomizationSelector
              restaurantId={Number(adminUser.restaurantId)}
              assignments={pendingCustomizations}
              onChange={setPendingCustomizations}
            />
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  // --- Main return JSX ---
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8">
      {renderEditDialog()}

      {/* <Card>
        <CardHeader>
          <CardTitle>Payment Settings</CardTitle>
          <CardDescription>Configure Tax, Discount and Upi-Id.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 max-w-sm">
            <div className="grid gap-2">
              <Label htmlFor="tax-rate">Tax Rate (%)</Label>
              <Input
                id="tax-rate"
                type="number"
                step="0.01"
                value={localTaxRate}
                onChange={(e) => setLocalTaxRate(e.target.value)}
                placeholder="e.g. 8.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="discount-rate">Discount Rate (%)</Label>
              <Input
                id="discount-rate"
                type="number"
                step="0.01"
                value={localDiscountRate}
                onChange={(e) => setLocalDiscountRate(e.target.value)}
                placeholder="e.g. 5.00"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="upi-id">UPI ID</Label>
              <Input
                id="upi-id"
                type="text"
                value={localUpiId}
                onChange={(e) => setLocalUpiId(e.target.value)}
                placeholder="e.g. platekhata@paytm, 2523553@icici"
              />
            </div>
            <Button onClick={handleSaveSettings}>Save Settings</Button>
          </div>
        </CardContent>
      </Card> */}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            {" "}
            <CardTitle>Menu Items</CardTitle>{" "}
            <CardDescription>Manage menu items.</CardDescription>{" "}
          </div>
          <Button onClick={handleCreateClick}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add Item
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading menu...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Veg</TableHead>
                  <TableHead>Customizations</TableHead>
                  <TableHead>Available</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {localMenuItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.category}</TableCell>
                    <TableCell>₹{item.price.toFixed(2)}</TableCell>
                    <TableCell>
                      {item.isVegetarian ? "Veg" : "Non-Veg"}
                    </TableCell>
                    <TableCell>
                      {item.customizationNames &&
                      item.customizationNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.customizationNames.map((name, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80"
                            >
                              {name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={item.isAvailable}
                        onCheckedChange={() =>
                          handleToggle(item.id, "isAvailable")
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditClick(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
