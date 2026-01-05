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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Armchair, MoveHorizontal, CheckCheck } from "lucide-react";
import type { TableStatus as TableStatusType } from "@/lib/types";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

export function TableStatus() {
  const {
    tableStatuses,
    isTablesLoading,
    moveTable,
    settleTable,
    clearTableSession,
  } = useCart();
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;
  const { toast } = useToast();

  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [sourceTable, setSourceTable] = useState<TableStatusType | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [flippedTableId, setFlippedTableId] = useState<number | null>(null);

  useEffect(() => {
    console.log("[DEBUG] TableStatus received:", tableStatuses);
  }, [tableStatuses]);

  const getStatusStyles = (status: TableStatusType["status"]) => {
    switch (status) {
      case "Empty":
        return "bg-status-empty-bg border-border text-status-empty-text hover:opacity-90";
      case "Occupied":
        return "bg-status-occupied-bg border-border text-status-occupied-text hover:opacity-90";
      case "Paid & Occupied":
        // Blue scheme for Paid & Occupied
        return "bg-blue-100 border-blue-300 text-blue-900 hover:bg-blue-200 dark:bg-blue-900/40 dark:border-blue-700 dark:text-blue-100";
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
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500 ring-2 ring-blue-500/20" />
            <span className="text-muted-foreground">Paid & Occupied</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isTablesLoading ? (
          <div className="text-center py-10 text-muted-foreground">
            <p>Loading tables...</p>
          </div>
        ) : Array.isArray(tableStatuses) && tableStatuses.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-3">
            {tableStatuses
              .sort((a, b) => {
                const numA = parseInt(a.tableNumber);
                const numB = parseInt(b.tableNumber);
                if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                return a.tableNumber.localeCompare(b.tableNumber);
              })
              .map((table) => {
                const isPaidOccupied = table.status === "Paid & Occupied";
                const isOccupied = table.status === "Occupied";
                const amountToShow =
                  isOccupied && table.unpaidAmount && table.unpaidAmount > 0
                    ? table.unpaidAmount
                    : table.totalAmount;

                const isFlipped = flippedTableId === table.id;

                return (
                  <div
                    key={table.id}
                    className="relative w-full aspect-square perspective-1000 group cursor-pointer"
                    onClick={() =>
                      !isFlipped && handleTableClick(table.tableNumber)
                    }
                  >
                    <div
                      className={cn(
                        "relative w-full h-full transition-all duration-500 transform-style-3d",
                        isFlipped ? "rotate-y-180" : ""
                      )}
                    >
                      {/* FRONT SIDE */}
                      <Card
                        className={cn(
                          "absolute w-full h-full backface-hidden flex flex-col items-center justify-between p-2 border-2 shadow-sm",
                          getStatusStyles(table.status)
                        )}
                      >
                        <div className="flex flex-col items-center gap-1 mt-1 relative w-full h-full justify-center">
                          {/* Move Icon */}
                          {(isOccupied || isPaidOccupied) && (
                            <div className="absolute -top-2 -right-1 z-10">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 bg-black/10 hover:bg-black/20 text-current rounded-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSourceTable(table);
                                  setIsMoveModalOpen(true);
                                }}
                              >
                                <MoveHorizontal className="w-3 h-3" />
                              </Button>
                            </div>
                          )}

                          {/* Payment Flip Icon */}
                          {isOccupied &&
                            table.unpaidAmount &&
                            table.unpaidAmount > 0 && (
                              <div className="absolute -top-2 -left-1 z-10">
                                <Button
                                  variant="secondary"
                                  size="icon"
                                  className="h-6 w-6 bg-black/10 hover:bg-black/20 text-current rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setFlippedTableId(table.id);
                                  }}
                                >
                                  <span className="text-[10px] font-bold">
                                    Pay
                                  </span>
                                </Button>
                              </div>
                            )}

                          {/* Finish/Clear Icon (for Paid & Occupied) */}
                          {isPaidOccupied && (
                            <div className="absolute -top-2 -left-1 z-10">
                              <Button
                                variant="secondary"
                                size="icon"
                                className="h-6 w-6 bg-green-600/20 hover:bg-green-600/40 text-green-700 dark:text-green-300 rounded-full border border-green-600/30"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (
                                    confirm(
                                      `Clear Table ${table.tableNumber} and finish session?`
                                    )
                                  ) {
                                    await clearTableSession(table.id);
                                    toast({
                                      title: "Table Cleared",
                                      description:
                                        "Session finished and table is now available.",
                                    });
                                  }
                                }}
                              >
                                <CheckCheck className="w-3 h-3" />
                              </Button>
                            </div>
                          )}

                          {/* Customer Name Display */}
                          {(isOccupied || isPaidOccupied) && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 z-0 w-full px-6 text-center">
                              <span className="text-[10px] font-bold text-slate-900 dark:text-slate-100 truncate block">
                                {typeof window !== "undefined" &&
                                  localStorage.getItem(
                                    `customer_name_${table.id}`
                                  )}
                              </span>
                            </div>
                          )}

                          <Armchair className="w-5 h-5 opacity-80" />
                          <p className="font-bold text-lg leading-none">
                            {table.tableNumber}
                          </p>

                          {(isOccupied || isPaidOccupied) && amountToShow ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                "border-0 text-[10px] h-5 mt-0.5 font-bold px-1",
                                isPaidOccupied
                                  ? "bg-blue-600/20 text-blue-900 dark:text-blue-100"
                                  : "bg-yellow-500/70"
                              )}
                            >
                              {isOccupied &&
                              table.unpaidAmount &&
                              table.unpaidAmount > 0
                                ? "Due: "
                                : ""}
                              {new Intl.NumberFormat("en-IN", {
                                style: "currency",
                                currency: "INR",
                                maximumFractionDigits: 0,
                              }).format(amountToShow)}
                            </Badge>
                          ) : (
                            <div className="h-5 mt-0.5" />
                          )}
                          {(isOccupied || isPaidOccupied) &&
                            table.occupiedSince && (
                              <TableTimer startTime={table.occupiedSince} />
                            )}
                        </div>
                      </Card>

                      {/* BACK SIDE (Payment) */}
                      <Card
                        className={cn(
                          "absolute w-full h-full backface-hidden rotate-y-180 bg-white dark:bg-zinc-900 border-2 border-primary flex flex-col items-center justify-center p-2 shadow-lg"
                        )}
                      >
                        <div className="flex flex-col items-center gap-2 w-full h-full">
                          <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-muted-foreground">
                              Settle Table {table.tableNumber}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFlippedTableId(null);
                              }}
                            >
                              <span className="text-lg leading-none">
                                &times;
                              </span>
                            </Button>
                          </div>

                          <div className="flex-1 flex flex-col items-center justify-center w-full gap-2">
                            <Button
                              className="w-full bg-green-600 hover:bg-green-700 text-white h-8 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                settleTable(table.id, "Cash");
                                setFlippedTableId(null);
                              }}
                            >
                              Cash
                            </Button>
                            <Button
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                settleTable(table.id, "UPI");
                                setFlippedTableId(null);
                              }}
                            >
                              UPI
                            </Button>
                          </div>

                          <div className="text-[10px] font-bold text-center">
                            Total:{" "}
                            {new Intl.NumberFormat("en-IN", {
                              style: "currency",
                              currency: "INR",
                            }).format(amountToShow || 0)}
                          </div>
                        </div>
                      </Card>
                    </div>
                  </div>
                );
              })}
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

      <Dialog open={isMoveModalOpen} onOpenChange={setIsMoveModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Move Table {sourceTable?.tableNumber}</DialogTitle>
            <DialogDescription>
              Select an available table to move current orders to.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[300px] pr-4">
            <div className="grid grid-cols-3 gap-3">
              {tableStatuses
                .filter((t) => t.status === "Empty" && t.isAvailable)
                .sort(
                  (a, b) => parseInt(a.tableNumber) - parseInt(b.tableNumber)
                )
                .map((target) => (
                  <Button
                    key={target.id}
                    variant="outline"
                    className="flex flex-col h-auto py-4 hover:bg-green-500/10 hover:border-green-500"
                    disabled={isMoving}
                    onClick={async () => {
                      if (!sourceTable) return;
                      setIsMoving(true);
                      try {
                        await moveTable(sourceTable.id, target.id);
                        toast({
                          title: "Table moved successfully",
                          description: `Moved Table ${sourceTable.tableNumber} -> Table ${target.tableNumber}`,
                        });
                        setIsMoveModalOpen(false);
                      } catch (err: any) {
                        toast({
                          title: "Failed to move table",
                          description: err.message,
                          variant: "destructive",
                        });
                      } finally {
                        setIsMoving(false);
                      }
                    }}
                  >
                    <Armchair className="w-5 h-5 mb-1" />
                    <span className="font-bold">{target.tableNumber}</span>
                  </Button>
                ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
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
