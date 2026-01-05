"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { TrendingUp, Package, IndianRupee } from "lucide-react";
import { SellingItem } from "@/lib/types";

interface TopSellingItemsProps {
  data: SellingItem[];
}

export function TopSellingItems({ data }: TopSellingItemsProps) {
  // Safe fallback if data is undefined
  const currentData = Array.isArray(data) ? data : [];

  return (
    <Card className="col-span-3 transition-all duration-300 hover:shadow-md border-none bg-gradient-to-br from-background to-secondary/20">
      <CardHeader className="flex flex-col gap-4 space-y-0 pb-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top Selling Items
            </CardTitle>
            <CardDescription>Most popular items by revenue</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {currentData.length > 0 ? (
            currentData.map((item, index) => (
              <div
                key={item.item_id}
                className="flex items-center justify-between group"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm transition-transform group-hover:scale-110">
                    {index + 1}
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none group-hover:text-primary transition-colors">
                      {item.item_name}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Package className="h-3 w-3" />
                      {item.total_quantity} sold
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold flex items-center justify-end gap-1">
                    <IndianRupee className="h-3 w-3" />
                    {Number(item.total_revenue).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                  <div className="mt-1 h-1 w-24 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{
                        width: `${
                          (Number(item.total_revenue) /
                            Number(currentData[0].total_revenue)) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground bg-muted/5 rounded-xl border border-dashed">
              <Package className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">No sales data for this period</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
