"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { CategoryService } from "@/services/category.service";
import { CustomizationService } from "@/services/customization.service";
import { Category, CustomizationGroup } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { CustomizationList } from "@/components/customizations/customization-list";
import { CustomizationDialog } from "@/components/customizations/customization-dialog";

export default function CategoriesPage() {
  // -- Category State --
  const [categories, setCategories] = useState<Category[]>([]);
  const [isCatLoading, setIsCatLoading] = useState(true);
  const [isCatDialogOpen, setIsCatDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catFormData, setCatFormData] = useState({
    name: "",
    display_order: 0,
  });

  // -- Customization State --
  const [customizationGroups, setCustomizationGroups] = useState<
    CustomizationGroup[]
  >([]);
  const [isCustLoading, setIsCustLoading] = useState(true);
  const [isCustDialogOpen, setIsCustDialogOpen] = useState(false);
  const [editingCustGroup, setEditingCustGroup] =
    useState<CustomizationGroup | null>(null);

  const { toast } = useToast();
  const { adminUser } = useAuth();

  useEffect(() => {
    if (adminUser?.restaurantId) {
      fetchCategories();
      fetchCustomizations();
    }
  }, [adminUser]);

  // -- Category Handlers --
  const fetchCategories = async () => {
    if (!adminUser?.restaurantId) return;
    setIsCatLoading(true);
    try {
      const data = await CategoryService.getAll(Number(adminUser.restaurantId));
      setCategories(data);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error fetching categories",
        description: "Please try again later.",
      });
    } finally {
      setIsCatLoading(false);
    }
  };

  const handleCatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await CategoryService.update(editingCategory.id, {
          name: catFormData.name,
          display_order: catFormData.display_order,
        });
        toast({ title: "Category updated" });
      } else {
        await CategoryService.create({
          name: catFormData.name,
          display_order: catFormData.display_order,
          restaurantId: adminUser?.restaurantId
            ? Number(adminUser.restaurantId)
            : undefined,
        });
        toast({ title: "Category created" });
      }
      setIsCatDialogOpen(false);
      resetCatForm();
      fetchCategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Something went wrong",
      });
    }
  };

  const handleCatDelete = async (id: number) => {
    if (!confirm("Are you sure? This might fail if items are linked.")) return;
    try {
      await CategoryService.delete(id);
      toast({ title: "Category deleted" });
      fetchCategories();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting",
        description: error.message,
      });
    }
  };

  const openCatEdit = (category: Category) => {
    setEditingCategory(category);
    setCatFormData({
      name: category.name,
      display_order: category.display_order,
    });
    setIsCatDialogOpen(true);
  };

  const resetCatForm = () => {
    setEditingCategory(null);
    setCatFormData({ name: "", display_order: 0 });
  };

  // -- Customization Handlers --
  const fetchCustomizations = async () => {
    if (!adminUser?.restaurantId) return;
    setIsCustLoading(true);
    try {
      const data = await CustomizationService.getAll(
        Number(adminUser.restaurantId)
      );
      setCustomizationGroups(data);
    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Error fetching customizations",
        description: "Please try again later.",
      });
    } finally {
      setIsCustLoading(false);
    }
  };

  const handleCustSubmit = async (data: any) => {
    try {
      if (editingCustGroup) {
        await CustomizationService.update(editingCustGroup.id, data);
        toast({ title: "Customization updated" });
      } else {
        await CustomizationService.create({
          ...data,
          restaurantId: Number(adminUser?.restaurantId),
        });
        toast({ title: "Customization created" });
      }
      fetchCustomizations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Something went wrong",
      });
    }
  };

  const handleCustDelete = async (id: number) => {
    if (!confirm("Are you sure? This will delete the group and its options."))
      return;
    try {
      await CustomizationService.delete(id);
      toast({ title: "Customization deleted" });
      fetchCustomizations();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error deleting",
        description: error.message,
      });
    }
  };

  const openCustEdit = (group: CustomizationGroup) => {
    setEditingCustGroup(group);
    setIsCustDialogOpen(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Menu Configuration
          </h2>
          <p className="text-muted-foreground">
            Manage your menu categories and customization options.
          </p>
        </div>
      </div>

      <Tabs defaultValue="categories" className="space-y-4">
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="customizations">Customizations</TabsTrigger>
        </TabsList>

        <TabsContent value="categories" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                resetCatForm();
                setIsCatDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Category
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Categories</CardTitle>
              <CardDescription>
                Drag and drop support coming soon. Use 'Order' to sort.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[100px]">Order</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isCatLoading ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center h-24">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : categories.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={3}
                        className="text-center h-24 text-muted-foreground"
                      >
                        No categories found. Add one to get started.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categories.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell>{category.display_order}</TableCell>
                        <TableCell className="font-medium">
                          {category.name}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openCatEdit(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleCatDelete(category.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog
            open={isCatDialogOpen}
            onOpenChange={(open) => {
              setIsCatDialogOpen(open);
              if (!open) resetCatForm();
            }}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingCategory ? "Edit Category" : "Add Category"}
                </DialogTitle>
                <DialogDescription>
                  Categories help organize your menu items for customers.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCatSubmit}>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="name" className="text-right">
                      Name
                    </Label>
                    <Input
                      id="name"
                      value={catFormData.name}
                      onChange={(e) =>
                        setCatFormData({ ...catFormData, name: e.target.value })
                      }
                      className="col-span-3"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="order" className="text-right">
                      Order
                    </Label>
                    <Input
                      id="order"
                      type="number"
                      value={catFormData.display_order}
                      onChange={(e) =>
                        setCatFormData({
                          ...catFormData,
                          display_order: parseInt(e.target.value) || 0,
                        })
                      }
                      className="col-span-3"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="submit">
                    {editingCategory ? "Save Changes" : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </TabsContent>

        <TabsContent value="customizations" className="space-y-4">
          <div className="flex justify-end">
            <Button
              onClick={() => {
                setEditingCustGroup(null);
                setIsCustDialogOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add Customization Group
            </Button>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Customization Groups</CardTitle>
              <CardDescription>
                Create reusable customization options (e.g., Sizes, Toppings).
              </CardDescription>
            </CardHeader>
            <CardContent>
              <CustomizationList
                groups={customizationGroups}
                isLoading={isCustLoading}
                onEdit={openCustEdit}
                onDelete={handleCustDelete}
              />
            </CardContent>
          </Card>
          <CustomizationDialog
            open={isCustDialogOpen}
            onOpenChange={setIsCustDialogOpen}
            onSubmit={handleCustSubmit}
            initialData={editingCustGroup}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
