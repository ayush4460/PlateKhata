"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { MenuItem } from "@/lib/types";
import { CustomizationService } from "@/services/customization.service";
import { Loader2 } from "lucide-react";

interface CustomizationSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: MenuItem | null;
  onConfirm: (
    item: MenuItem,
    selectedOptions: {
      id: number;
      name: string;
      price: number;
      groupId: number;
    }[]
  ) => void;
}

export function CustomizationSelectionDialog({
  open,
  onOpenChange,
  item,
  onConfirm,
}: CustomizationSelectionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [customizationGroups, setCustomizationGroups] = useState<any[]>([]);
  const [selections, setSelections] = useState<Record<number, number[]>>({}); // groupId -> [optionId, ...]

  useEffect(() => {
    if (open && item) {
      fetchCustomizations();
      setSelections({}); // Reset
    }
  }, [open, item]);

  const fetchCustomizations = async () => {
    if (!item) return;
    setLoading(true);
    try {
      const groups = await CustomizationService.getForItem(Number(item.id));
      setCustomizationGroups(groups);

      // Initialize defaults
      const initialSelections: Record<number, number[]> = {};
      groups.forEach((group: any) => {
        // You might want to auto-select default options here if backend provided them
        // For now, empty or based on logic
        if (
          group.is_required &&
          group.min_selection === 1 &&
          // group.max_selection === 1 // Even if max is > 1, if min is 1, we should probably pick one? usually match radio behavior
          group.options.length > 0
        ) {
          // Auto-select the first option (usually the base/cheapest one if sorted)
          // ideally we select the one with lowest price modifier?
          // Backend sorts options by display_order. We trust that.
          initialSelections[group.group_id] = [group.options[0].option_id];
        }
      });
      setSelections(initialSelections);
    } catch (error) {
      console.error("Failed to load customizations", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionToggle = (
    groupId: number,
    optionId: number,
    allowMultiple: boolean,
    max: number
  ) => {
    setSelections((prev) => {
      const current = prev[groupId] || [];
      if (current.includes(optionId)) {
        // Deselect
        return { ...prev, [groupId]: current.filter((id) => id !== optionId) };
      } else {
        // Select
        if (!allowMultiple) {
          // Single select (Radio behavior)
          return { ...prev, [groupId]: [optionId] };
        } else {
          // Multi select
          if (current.length >= max) return prev; // Max limit reached
          return { ...prev, [groupId]: [...current, optionId] };
        }
      }
    });
  };

  const calculateTotal = () => {
    if (!item) return 0;
    let total = item.price;
    customizationGroups.forEach((group) => {
      const selectedIds = selections[group.group_id] || [];
      selectedIds.forEach((optId) => {
        const option = group.options.find((o: any) => o.option_id === optId);
        if (option) {
          total += Number(option.price_modifier || 0);
        }
      });
    });
    return total;
  };

  const isValid = useMemo(() => {
    return customizationGroups.every((group) => {
      const selectedCount = (selections[group.group_id] || []).length;
      if (group.is_required && selectedCount < group.min_selection)
        return false;
      if (selectedCount > group.max_selection) return false;
      return true;
    });
  }, [customizationGroups, selections]);

  const handleConfirm = () => {
    if (!item || !isValid) return;

    // Flatten selections
    const allSelectedOptions: {
      id: number;
      name: string;
      price: number;
      groupId: number;
    }[] = [];

    customizationGroups.forEach((group) => {
      const selectedIds = selections[group.group_id] || [];
      selectedIds.forEach((optId) => {
        const option = group.options.find((o: any) => o.option_id === optId);
        if (option) {
          allSelectedOptions.push({
            id: option.option_id,
            name: option.name,
            price: Number(option.price_modifier),
            groupId: group.group_id,
          });
        }
      });
    });

    onConfirm(item, allSelectedOptions);
    onOpenChange(false);
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize {item.name}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-4">
            {customizationGroups.map((group) => (
              <div key={group.group_id} className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-semibold">
                    {group.group_name}
                    {group.is_required && (
                      <span className="text-destructive ml-1">*</span>
                    )}
                  </Label>
                  <span className="text-xs text-muted-foreground">
                    {group.max_selection > 1
                      ? `Select up to ${group.max_selection}`
                      : "Select 1"}
                  </span>
                </div>

                <div className="grid gap-2">
                  {group.options.map((option: any) => {
                    const isSelected = (
                      selections[group.group_id] || []
                    ).includes(option.option_id);
                    const isSingle = group.max_selection === 1;

                    return (
                      <div
                        key={option.option_id}
                        className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:bg-muted/50"
                        }`}
                        onClick={() =>
                          handleOptionToggle(
                            group.group_id,
                            option.option_id,
                            !isSingle,
                            group.max_selection
                          )
                        }
                      >
                        <div className="flex items-center gap-3">
                          {isSingle ? (
                            <div
                              className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                                isSelected
                                  ? "border-primary"
                                  : "border-muted-foreground"
                              }`}
                            >
                              {isSelected && (
                                <div className="h-2 w-2 rounded-full bg-primary" />
                              )}
                            </div>
                          ) : (
                            <Checkbox checked={isSelected} />
                          )}
                          <span className="font-medium text-sm">
                            {option.name}
                          </span>
                        </div>
                        <span className="text-sm font-medium text-muted-foreground">
                          ₹
                          {(
                            item.price + Number(option.price_modifier || 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-3 sm:justify-between items-center border-t pt-4">
          <div className="text-lg font-bold">
            ₹{calculateTotal().toFixed(2)}
          </div>
          <Button
            onClick={handleConfirm}
            disabled={!isValid || loading}
            className="w-full sm:w-auto"
          >
            Add to Order
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
