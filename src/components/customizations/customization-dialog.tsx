"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Plus, Trash2, X } from "lucide-react";
import {
  CustomizationGroup,
  CreateCustomizationGroupDTO,
  CustomizationOption,
} from "@/lib/types";

interface CustomizationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  initialData?: CustomizationGroup | null;
}

export function CustomizationDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
}: CustomizationDialogProps) {
  const [name, setName] = useState("");
  const [minSelection, setMinSelection] = useState(0);
  const [maxSelection, setMaxSelection] = useState(1);
  const [isRequired, setIsRequired] = useState(false);
  const [options, setOptions] = useState<Partial<CustomizationOption>[]>([]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name);
        setMinSelection(initialData.min_selection);
        setMaxSelection(initialData.max_selection);
        setIsRequired(initialData.is_required);
        setOptions(initialData.options || []);
      } else {
        resetForm();
      }
    }
  }, [open, initialData]);

  const resetForm = () => {
    setName("");
    setMinSelection(0);
    setMaxSelection(1);
    setIsRequired(false);
    setOptions([{ name: "", is_available: true, display_order: 0 }]);
  };

  const handleAddOption = () => {
    setOptions([
      ...options,
      { name: "", is_available: true, display_order: options.length },
    ]);
  };

  const handleRemoveOption = (index: number) => {
    const newOptions = options.filter((_, i) => i !== index);
    setOptions(newOptions);
  };

  const handleOptionChange = (
    index: number,
    field: keyof CustomizationOption,
    value: any
  ) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], [field]: value };
    setOptions(newOptions);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({
      name,
      minSelection,
      maxSelection,
      isRequired,
      options: options.filter((o) => o.name?.trim()),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData
              ? "Edit Customization Group"
              : "Create Customization Group"}
          </DialogTitle>
          <DialogDescription>
            Define a group of options (e.g., "Size", "Toppings") for your menu
            items.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Group Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pizza Size"
                required
              />
            </div>
            <div className="flex items-center space-x-2 pt-8">
              <Switch checked={isRequired} onCheckedChange={setIsRequired} />
              <Label>Required Selection?</Label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Selection</Label>
              <Input
                type="number"
                min={0}
                value={minSelection}
                onChange={(e) => setMinSelection(parseInt(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Max Selection</Label>
              <Input
                type="number"
                min={1}
                value={maxSelection}
                onChange={(e) => setMaxSelection(parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Options</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddOption}
              >
                <Plus className="h-4 w-4 mr-2" /> Add Option
              </Button>
            </div>

            <div className="space-y-3">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="grid place-items-center h-6 w-6 text-sm text-muted-foreground">
                    {index + 1}
                  </div>
                  <Input
                    value={option.name}
                    onChange={(e) =>
                      handleOptionChange(index, "name", e.target.value)
                    }
                    placeholder="Option Name (e.g. Small)"
                    className="flex-1"
                    required
                  />
                  <Switch
                    checked={option.is_available ?? true}
                    onCheckedChange={(checked) =>
                      handleOptionChange(index, "is_available", checked)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOption(index)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit">
              {initialData ? "Save Changes" : "Create Group"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
