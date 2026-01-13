"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Settings2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CustomizationService } from "@/services/customization.service";
import { CustomizationGroup } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";

interface CustomizationSelectorProps {
  restaurantId: number;
  // assignments: { groupId: number, overrides: { optionId: number, priceModifier: number, isDefault: boolean }[] }[]
  assignments: any[];
  onChange: (newAssignments: any[]) => void;
}

export function CustomizationSelector({
  restaurantId,
  assignments,
  onChange,
}: CustomizationSelectorProps) {
  const [availableGroups, setAvailableGroups] = useState<CustomizationGroup[]>(
    []
  );
  const [isLoading, setIsLoading] = useState(true);

  // Assign Dialog State
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [overrides, setOverrides] = useState<
    { optionId: number; priceModifier: number; isDefault: boolean }[]
  >([]);
  const [isEditingIndex, setIsEditingIndex] = useState<number | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    fetchGroups();
  }, [restaurantId]);

  const fetchGroups = async () => {
    setIsLoading(true);
    try {
      if (restaurantId) {
        const groups = await CustomizationService.getAll(restaurantId);
        setAvailableGroups(groups);
      }
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error loading customizations" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenAssign = () => {
    setSelectedGroupId("");
    setOverrides([]);
    setIsEditingIndex(null);
    setIsAssignDialogOpen(true);
  };

  const handleOpenEdit = (index: number) => {
    const assignment = assignments[index];
    setSelectedGroupId(String(assignment.groupId));
    setOverrides(assignment.overrides || []);
    setIsEditingIndex(index);
    setIsAssignDialogOpen(true);
  };

  const handleGroupSelect = (val: string) => {
    setSelectedGroupId(val);
    const group = availableGroups.find((g) => String(g.id) === val);
    if (group) {
      // Init overrides from group options if not editing existing
      // If switching groups while assigning, reset overrides
      setOverrides(
        group.options.map((opt) => ({
          optionId: opt.id,
          priceModifier: 0,
          isDefault: false,
        }))
      );
    }
  };

  const handleOverrideChange = (
    optionId: number,
    field: "priceModifier" | "isDefault",
    value: any
  ) => {
    setOverrides((prev) =>
      prev.map((o) => (o.optionId === optionId ? { ...o, [field]: value } : o))
    );
  };

  const handleSaveAssignment = () => {
    if (!selectedGroupId) return;

    const group = availableGroups.find((g) => String(g.id) === selectedGroupId);
    if (!group) return;

    const newAssignment = {
      groupId: Number(selectedGroupId),
      groupName: group.name,
      overrides: overrides,
    };

    if (isEditingIndex !== null) {
      // Update existing
      const updated = [...assignments];
      updated[isEditingIndex] = newAssignment;
      onChange(updated);
    } else {
      // Check if already exists
      if (assignments.some((a) => String(a.groupId) === selectedGroupId)) {
        toast({ variant: "destructive", title: "Group already added" });
        return;
      }
      onChange([...assignments, newAssignment]);
    }

    setIsAssignDialogOpen(false);
  };

  const handleRemoveAssignment = (index: number) => {
    const updated = [...assignments];
    updated.splice(index, 1);
    onChange(updated);
  };

  const activeGroup = availableGroups.find(
    (g) => String(g.id) === selectedGroupId
  );

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <Label className="text-sm font-medium">Customizations</Label>
        <Button
          type="button"
          onClick={handleOpenAssign}
          variant="outline"
          size="sm"
          className="h-8 gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> Add Group
        </Button>
      </div>

      <div className="space-y-2">
        {assignments.length === 0 ? (
          <div className="text-xs text-muted-foreground italic p-2 border border-dashed rounded-md text-center">
            No customizations added. Item uses base price only.
          </div>
        ) : (
          assignments.map((assignment, idx) => (
            <div
              key={assignment.groupId}
              className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-900 border rounded-lg text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{assignment.groupName}</span>
                <Badge variant="secondary" className="text-[10px] h-5">
                  {assignment.overrides.length} options
                </Badge>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleOpenEdit(idx)}
                >
                  <Settings2 className="h-4 w-4 text-slate-500" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 hover:bg-red-50 hover:text-red-500"
                  onClick={() => handleRemoveAssignment(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isEditingIndex !== null ? "Edit" : "Add"} Customization Group
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Select Group</Label>
              <Select
                value={selectedGroupId}
                onValueChange={handleGroupSelect}
                disabled={isEditingIndex !== null}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a customization group..." />
                </SelectTrigger>
                <SelectContent>
                  {availableGroups.map((g) => (
                    <SelectItem key={g.id} value={String(g.id)}>
                      {g.name} ({g.options.length} options)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {activeGroup && (
              <div className="space-y-3 border rounded-md p-3 max-h-[400px] overflow-y-auto">
                <div className="flex justify-between items-center pb-2 border-b">
                  <Label>Option Price Overrides</Label>
                  <Badge variant="outline" className="text-[10px]">
                    Base item price will be added to this
                  </Badge>
                </div>

                {activeGroup.options.map((opt) => {
                  const override = overrides.find((o) => o.optionId === opt.id);
                  const priceMod = override ? override.priceModifier : 0;
                  // const isDef = override ? override.isDefault : false;

                  return (
                    <div
                      key={opt.id}
                      className="grid grid-cols-[1fr_100px] gap-4 items-center py-2"
                    >
                      <div className="text-sm">
                        <span className="font-medium">{opt.name}</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                          +₹
                        </span>
                        <Input
                          type="number"
                          min="0"
                          className="h-7 pl-7"
                          value={priceMod}
                          onChange={(e) =>
                            handleOverrideChange(
                              opt.id,
                              "priceModifier",
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </div>
                      {/* Future: Checkbox for isDefault if needed */}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAssignDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveAssignment} disabled={!selectedGroupId}>
              {isEditingIndex !== null ? "Update" : "Add to Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
