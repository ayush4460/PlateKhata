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
import { Armchair, RotateCcw } from "lucide-react";
import type { TableStatus as TableStatusType } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";

export function TableStatus() {
  const { tableStatuses, clearTableSession } = useCart();

  useEffect(() => {
    console.log("[DEBUG] TableStatus received:", tableStatuses);
  }, [tableStatuses]);

  const getStatusStyles = (status: TableStatusType["status"]) => {
    switch (status) {
      case "Empty":
        return "bg-green-50 border-green-200 text-green-800";
      case "Occupied":
        return "bg-yellow-50 border-yellow-200 text-yellow-800";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const handleClear = (e: React.MouseEvent, tableId: number) => {
    e.stopPropagation();
    if (
      confirm(
        "Clear table? This will start a new session for the next customer."
      )
    ) {
      clearTableSession(tableId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Table Status</CardTitle>
        <CardDescription>
          Live overview. Click "Clear" when customers leave to reset the table.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {Array.isArray(tableStatuses) && tableStatuses.length > 0 ? (
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
                    "flex flex-col items-center justify-between p-3 aspect-square transition-all border-2 shadow-sm",
                    getStatusStyles(table.status)
                  )}
                >
                  <div className="flex flex-col items-center gap-1 mt-2">
                    <Armchair className="w-6 h-6 opacity-80" />
                    <p className="font-bold text-xl">#{table.tableNumber}</p>
                    <Badge
                      variant="outline"
                      className="bg-black/70 border-0 text-[12px] h-7 mt-2"
                    >
                      {table.status}
                    </Badge>
                  </div>

                  {/* Always Visible Clear Button for Occupied Tables */}
                  {/**table.status === 'Occupied' && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="h-7 text-[12px] mt-2"
                                        onClick={(e) => handleClear(e, table.id)}
                                    >
                                        <RotateCcw className="w-3 h-3 mr-1" /> Clear
                                    </Button>
                                )*/}
                </Card>
              ))}
          </div>
        ) : (
          <div className="text-center py-10 text-muted-foreground">
            <p>Loading tables...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
