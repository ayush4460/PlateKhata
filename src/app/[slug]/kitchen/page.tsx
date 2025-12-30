// src/app/[slug]/kitchen/page.tsx
"use client";

import { OrderColumn } from "@/components/kitchen/order-column";
import { useCart } from "@/hooks/use-cart";
import { useAuth } from "@/hooks/use-auth"; // Import useAuth
import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

// Match categories from your menu editor
const KITCHEN_CATEGORIES = [
  "All",
  "Specials",
  "Beverages",
  "Starters",
  "Salads",
  "Soups",
  "Main Course",
  "Breads",
  "Desserts",
  "Appetizers",
];

interface PageProps {
  params: { slug: string };
}

export default function KitchenPage({ params }: PageProps) {
  const { kitchenOrders, updateKitchenOrderStatus, connectSocket } = useCart();
  const { logout } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState("All");

  useEffect(() => {
    connectSocket();
  }, [connectSocket]);

  // Helper to filter items within an order based on selected category
  const filterOrderItems = (orders: any[]) => {
    if (selectedCategory === "All") return orders;

    return orders
      .map((order) => {
        // Filter items inside the order
        const relevantItems = order.items.filter(
          (item: any) => item.category === selectedCategory
        );

        return {
          ...order,
          items: relevantItems,
        };
      })
      .filter((order) => order.items.length > 0);
  };

  return (
    <div className="flex flex-col h-full gap-4 p-4">
      {/* Header with Title, Filter, and Logout */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-background border rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold">Kitchen Dashboard</h1>

        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground hidden md:inline">
              Station:
            </span>
            <Select
              value={selectedCategory}
              onValueChange={setSelectedCategory}
            >
              <SelectTrigger className="w-[150px] md:w-[180px]">
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {KITCHEN_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Logout Button */}
          <Button
            variant="destructive"
            size="sm"
            onClick={logout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden md:inline">Logout</span>
          </Button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid h-full flex-1 grid-cols-1 gap-4 md:grid-cols-3">
        <OrderColumn
          title="New Orders"
          status="new"
          orders={filterOrderItems(kitchenOrders.new || [])}
          onMoveOrder={(id) =>
            updateKitchenOrderStatus(id, "new", "in-progress")
          }
          actionText="Start Cooking"
        />
        <OrderColumn
          title="Cooking"
          status="in-progress"
          orders={filterOrderItems(kitchenOrders["in-progress"] || [])}
          onMoveOrder={(id) =>
            updateKitchenOrderStatus(id, "in-progress", "completed")
          }
          actionText="Mark as Ready"
        />
        <OrderColumn
          title="Ready"
          status="completed"
          orders={filterOrderItems(kitchenOrders.completed || [])}
        />
      </div>
    </div>
  );
}
