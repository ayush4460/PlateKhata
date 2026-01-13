"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { CustomizationGroup } from "@/lib/types";

interface CustomizationListProps {
  groups: CustomizationGroup[];
  isLoading: boolean;
  onEdit: (group: CustomizationGroup) => void;
  onDelete: (id: number) => void;
}

export function CustomizationList({
  groups,
  isLoading,
  onEdit,
  onDelete,
}: CustomizationListProps) {
  if (isLoading) {
    return <div className="text-center p-8">Loading customizations...</div>;
  }

  if (groups.length === 0) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No customization groups found. Add one to get started.
      </div>
    );
  }

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Selection Rule</TableHead>
            <TableHead>Options</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groups.map((group) => (
            <TableRow key={group.id}>
              <TableCell className="font-medium">{group.name}</TableCell>
              <TableCell>
                <div className="text-sm text-muted-foreground">
                  {group.is_required ? (
                    <Badge variant="destructive" className="mr-2">
                      Required
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="mr-2">
                      Optional
                    </Badge>
                  )}
                  {group.min_selection} - {group.max_selection}
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap gap-1">
                  {group.options?.map((opt) => (
                    <Badge
                      key={opt.id}
                      variant="outline"
                      className={
                        !opt.is_available ? "opacity-50 line-through" : ""
                      }
                    >
                      {opt.name}
                    </Badge>
                  ))}
                  {(!group.options || group.options.length === 0) && (
                    <span className="text-sm text-muted-foreground">
                      No options
                    </span>
                  )}
                </div>
              </TableCell>
              <TableCell>
                {group.is_active ? (
                  <Badge className="bg-green-500">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onEdit(group)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive"
                  onClick={() => onDelete(group.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
