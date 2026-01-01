// src/components/dashboard/table-status.tsx
"use client";

import { useCart } from "@/hooks/use-cart";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Armchair } from "lucide-react";
import type { TableStatus as TableStatusType } from "@/lib/types";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";

export function TableStatus() {
  const { tableStatuses, isTablesLoading } = useCart();
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  useEffect(() => {
    console.log("[DEBUG] TableStatus received:", tableStatuses);
  }, [tableStatuses]);

  const getStatusStyles = (status: TableStatusType["status"]) => {
    switch (status) {
      case "Empty":
        return "bg-status-empty-bg border-border text-status-empty-text hover:opacity-90";
      case "Occupied":
        return "bg-status-occupied-bg border-border text-status-occupied-text hover:opacity-90";
      default:
        return "bg-muted border-border hover:bg-muted/80";
    }
  };

  const handleTableClick = (tableNumber: string) => {
    if (slug) {
      router.push(`/${slug}/dashboard/tables/${tableNumber}`);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="space-y-1">
          <CardTitle>Table Status</CardTitle>
          <CardDescription>
            Live overview. Click on a table to manage orders, add items, or
            clear it.
          </CardDescription>
        </div>
        <div className="flex items-center gap-6 text-sm font-medium">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-600 ring-2 ring-green-600/20" />
            <span className="text-muted-foreground">Available</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500 ring-2 ring-yellow-500/20" />
            <span className="text-muted-foreground">Occupied</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isTablesLoading ? (
          <div className="text-center py-10 text-muted-foreground">
            <p>Loading tables...</p>
          </div>
        ) : Array.isArray(tableStatuses) && tableStatuses.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
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
                  className={cn(
                    "flex flex-col items-center justify-between p-3 aspect-square transition-all border-2 shadow-sm cursor-pointer",
                    getStatusStyles(table.status)
                  )}
                  onClick={() => handleTableClick(table.tableNumber)}
                >
                  <div className="flex flex-col items-center gap-1 mt-2">
                    <Armchair className="w-6 h-6 opacity-80" />
                    <p className="font-bold text-xl">#{table.tableNumber}</p>
                    {table.status === "Occupied" && table.totalAmount ? (
                      <Badge
                        variant="outline"
                        className="bg-black/70 border-0 text-[12px] h-7 mt-2 font-bold"
                      >
                        {new Intl.NumberFormat("en-IN", {
                          style: "currency",
                          currency: "INR",
                        }).format(table.totalAmount)}
                      </Badge>
                    ) : (
                      <div className="h-7 mt-2" /> // Maintain layout spacing
                    )}
                    {table.status === "Occupied" && table.occupiedSince && (
                      <TableTimer startTime={table.occupiedSince} />
                    )}
                  </div>
                </Card>
              ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <p>No tables found.</p>
            <p className="text-sm mt-2">
              If you have added tables, ensure they are marked as valid.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TableTimer({ startTime }: { startTime: number }) {
  const [elapsed, setElapsed] = useState("");

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const diff = now - startTime;
      if (diff < 0) return setElapsed("00:00");

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const secs = Math.floor((diff % (1000 * 60)) / 1000);

      const h = hours > 0 ? `${hours}:` : "";
      const m = mins.toString().padStart(2, "0");
      const s = secs.toString().padStart(2, "0");
      setElapsed(`${h}${m}:${s}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  return (
    <span className="text-xs text-muted-foreground font-mono mt-1">
      {elapsed}
    </span>
  );
}
