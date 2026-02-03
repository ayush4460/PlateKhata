"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Plus, Trash2, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CustomizationService } from "@/services/customization.service";
import { CustomizationGroup } from "@/lib/types";

interface MenuItemCustomizationManagerProps {
  itemId: number;
  restaurantId: number;
}

export function MenuItemCustomizationManager({
  itemId,
  restaurantId,
}: MenuItemCustomizationManagerProps) {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [availableGroups, setAvailableGroups] = useState<CustomizationGroup[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);

  // Assign Dialog State
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [overrides, setOverrides] = useState<
    { optionId: number; priceModifier: number; isDefault: boolean }[]
  >([]);

  const { toast } = useToast();

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [groups, currentAssignments] = await Promise.all([
        CustomizationService.getAll(restaurantId),
        CustomizationService.getForItem(itemId),
      ]);
      setAvailableGroups(groups);
      setAssignments(currentAssignments);
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error loading customizations" });
    } finally {
      setIsLoading(false);
    }
  }, [itemId, restaurantId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Optimize rendering of assignments list using useMemo
  // This ensures the list is only re-calculated when assignments change,
  // preventing unnecessary sorts/filters on every render.
  const sortedAssignments = useMemo(() => {
    return [...assignments].sort((a, b) =>
      (a.group_name || "").localeCompare(b.group_name || ""),
    );
  }, [assignments]);

  const handleOpenAssign = useCallback(() => {
    setSelectedGroupId("");
    setOverrides([]);
    setIsAssignDialogOpen(true);
  }, []);

  const handleOpenEdit = useCallback((assignment: any) => {
    setSelectedGroupId(String(assignment.group_id));
    // Flatten current options to overrides format
    const currentOverrides = assignment.options.map((opt: any) => ({
      optionId: opt.option_id,
      priceModifier: Number(opt.price_modifier),
      isDefault: opt.is_default,
    }));
    setOverrides(currentOverrides);
    setIsAssignDialogOpen(true);
  }, []);

  const handleGroupSelect = useCallback(
    (val: string) => {
      setSelectedGroupId(val);
      const group = availableGroups.find((g) => String(g.id) === val);
      if (group) {
        // Init overrides from group options
        setOverrides(
          group.options.map((opt) => ({
            optionId: opt.id,
            priceModifier: 0,
            isDefault: false,
          })),
        );
      }
    },
    [availableGroups],
  );

  const handleOverrideChange = useCallback(
    (optionId: number, field: string, value: any) => {
      setOverrides((prev) =>
        prev.map((o) =>
          o.optionId === optionId ? { ...o, [field]: value } : o,
        ),
      );
    },
    [],
  );

  const handleSaveAssignment = useCallback(async () => {
    if (!selectedGroupId) return;
    try {
      await CustomizationService.assignToItem({
        itemId,
        groupId: Number(selectedGroupId),
        optionsOverrides: overrides,
      });
      toast({ title: "Customization assigned" });
      setIsAssignDialogOpen(false);
      // Re-fetch to update the list
      fetchData();
    } catch (error) {
      toast({ variant: "destructive", title: "Error saving assignment" });
    }
  }, [itemId, selectedGroupId, overrides, fetchData, toast]);

  const handleRemove = useCallback(
    async (groupId: number) => {
      if (!confirm("Remove this customization group from this item?")) return;
      try {
        await CustomizationService.removeForItem(itemId, groupId);
        toast({ title: "Customization removed" });
        fetchData();
      } catch (error) {
        toast({ variant: "destructive", title: "Error removing assignment" });
      }
    },
    [itemId, fetchData, toast],
  );

  // Helper to get option name safely - Memoized? Not crucial but good practice if heavy lookup
  const getOptionName = useCallback(
    (optionId: number) => {
      const group = availableGroups.find(
        (g) => String(g.id) === selectedGroupId,
      );
      return group?.options.find((o) => o.id === optionId)?.name || "Option";
    },
    [availableGroups, selectedGroupId],
  );

  return (
    <div className="space-y-4 border rounded-md p-4">
      <div className="flex justify-between items-center">
        <Label className="text-base font-semibold">Customizations</Label>
        <Button size="sm" variant="outline" onClick={handleOpenAssign}>
          <Plus className="h-4 w-4 mr-2" /> Add Group
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-2">
          {sortedAssignments.length === 0 && (
            <div className="text-sm text-muted-foreground">
              No customizations assigned.
            </div>
          )}
          {sortedAssignments.map((assign) => (
            <div
              key={assign.group_id}
              className="flex justify-between items-center bg-secondary/20 p-2 rounded"
            >
              <div>
                <div className="font-medium">{assign.group_name}</div>
                <div className="text-xs text-muted-foreground">
                  {assign.options.length} options
                  {assign.is_required && " (Required)"}
                </div>
              </div>
              <div className="flex space-x-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => handleOpenEdit(assign)}
                  title="Edit Prices"
                >
                  <Settings2 className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => handleRemove(assign.group_id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Assign/Edit Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Configure Customization</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Select Group</Label>
              <Select value={selectedGroupId} onValueChange={handleGroupSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a group..." />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedGroupId && (
              <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                <Label>Option Price Overrides</Label>
                {overrides.map((opt) => (
                  <div
                    key={opt.optionId}
                    className="flex items-center justify-between gap-2 border-b pb-2"
                  >
                    <span
                      className="text-sm font-medium w-1/3 truncate"
                      title={getOptionName(opt.optionId)}
                    >
                      {getOptionName(opt.optionId)}
                    </span>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs">Extra Price (₹)</Label>
                      <Input
                        type="number"
                        className="w-24 h-8"
                        value={opt.priceModifier}
                        onChange={(e) =>
                          handleOverrideChange(
                            opt.optionId,
                            "priceModifier",
                            parseFloat(e.target.value),
                          )
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={handleSaveAssignment}>Save Configuration</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
