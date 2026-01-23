"use strict";
"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { PlatformService, Restaurant } from "@/services/platform.service";
import {
  Plus,
  MoreHorizontal,
  UserPlus,
  Pencil,
  Trash2,
  Power,
  ChefHat,
  UserCog,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function SuperAdminDashboard() {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Dialog States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [selectedRest, setSelectedRest] = useState<Restaurant | null>(null);

  // Forms
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    contactEmail: "",
    address: "",
    contactNumber: "",
  });

  const fetchRestaurants = async () => {
    try {
      const data = await PlatformService.getAllRestaurants();
      // The service returns the full ApiResponse object
      // @ts-ignore
      setRestaurants(data.data || []);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to load restaurants",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRestaurants();
  }, []);

  // --- Handlers ---

  const handleCreateRestaurant = async () => {
    try {
      await PlatformService.createRestaurant({ ...formData, isActive: true });
      toast({
        title: "Success",
        description: "Restaurant onboarded successfully",
      });
      setIsAddOpen(false);
      fetchRestaurants();
      setFormData({
        name: "",
        slug: "",
        contactEmail: "",
        address: "",
        contactNumber: "",
      });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to create",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRestaurant = async () => {
    if (!selectedRest) return;
    try {
      await PlatformService.updateRestaurant(
        selectedRest.restaurant_id,
        formData,
      );
      toast({ title: "Success", description: "Restaurant updated" });
      setIsEditOpen(false);
      fetchRestaurants();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const handleToggleActive = async (rest: Restaurant) => {
    try {
      await PlatformService.updateRestaurant(rest.restaurant_id, {
        isActive: !rest.is_active,
      });
      toast({
        title: "Success",
        description: `Restaurant ${!rest.is_active ? "Activated" : "Deactivated"}`,
      });
      fetchRestaurants();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const openEdit = (rest: Restaurant) => {
    setSelectedRest(rest);
    setFormData({
      name: rest.name,
      slug: rest.slug,
      contactEmail: rest.contact_email,
      address: rest.address || "",
      contactNumber: "",
    });
    setIsEditOpen(true);
  };

  // Enhanced state for generic user creation
  const [isUserOpen, setIsUserOpen] = useState(false);
  const [targetRole, setTargetRole] = useState<
    "admin" | "kitchen" | "supervisor"
  >("admin"); // 2. Updated targetRole type

  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    password: "",
    fullName: "",
  });

  // ... (existing handlers)

  const handleCreateUser = async () => {
    if (!selectedRest) return;
    try {
      await PlatformService.registerRestaurantAdmin({
        ...userForm,
        restaurantId: selectedRest.restaurant_id,
        role: targetRole,
      });
      // 4. Update toast logic
      const roleLabel =
        targetRole === "admin"
          ? "Admin"
          : targetRole === "supervisor"
            ? "Supervisor"
            : "Kitchen Staff";
      toast({
        title: "Success",
        description: `${roleLabel} created`,
      });
      setIsUserOpen(false);
      setUserForm({ username: "", email: "", password: "", fullName: "" });
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    }
  };

  const openUserDialog = (
    rest: Restaurant,
    role: "admin" | "kitchen" | "supervisor",
  ) => {
    setSelectedRest(rest);
    setTargetRole(role);
    setIsUserOpen(true);
  };

  // ... (render)

  // ... (update Dialog to use isUserOpen, userForm, targetRole)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Restaurants</h2>
          <p className="text-muted-foreground">
            Manage your onboarded partners.
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-black hover:bg-neutral-800"
        >
          <Plus className="mr-2 h-4 w-4" /> Onboard Restaurant
        </Button>
      </div>

      <div className="border rounded-lg bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {restaurants.length === 0 && !loading && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-10 text-muted-foreground"
                >
                  No restaurants found. Start by onboarding one.
                </TableCell>
              </TableRow>
            )}
            {restaurants.map((rest) => (
              <TableRow key={rest.restaurant_id}>
                <TableCell className="font-medium">
                  {rest.restaurant_id}
                </TableCell>
                <TableCell>{rest.name}</TableCell>
                <TableCell className="font-mono text-xs">{rest.slug}</TableCell>
                <TableCell>{rest.contact_email}</TableCell>
                <TableCell>
                  {rest.is_active ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-0">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-neutral-500">
                      Inactive
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => openEdit(rest)}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openUserDialog(rest, "admin")}
                      >
                        <UserPlus className="mr-2 h-4 w-4" /> Create Admin
                      </DropdownMenuItem>
                      {/* 3. Add Create Supervisor Item */}
                      <DropdownMenuItem
                        onClick={() => openUserDialog(rest, "supervisor")}
                      >
                        <UserCog className="mr-2 h-4 w-4" /> Create Supervisor
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => openUserDialog(rest, "kitchen")}
                      >
                        <ChefHat className="mr-2 h-4 w-4" /> Create Kitchen
                        Staff
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleToggleActive(rest)}
                        className={
                          rest.is_active ? "text-red-600" : "text-green-600"
                        }
                      >
                        <Power className="mr-2 h-4 w-4" />
                        {rest.is_active ? "Deactivate" : "Activate"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* --- ADD DIALOG --- */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Onboard New Restaurant</DialogTitle>
            <DialogDescription>
              Enter the details for the new partnership.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Restaurant Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g. Chai Pizza Zone"
              />
            </div>
            <div className="grid gap-2">
              <Label>Slug (URL Identifier)</Label>
              <Input
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
                placeholder="e.g. chai-pizza-zone"
              />
            </div>
            <div className="grid gap-2">
              <Label>Contact Email</Label>
              <Input
                value={formData.contactEmail}
                onChange={(e) =>
                  setFormData({ ...formData, contactEmail: e.target.value })
                }
                placeholder="contact@restaurant.com"
              />
            </div>
            <div className="grid gap-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                placeholder="City, State"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateRestaurant}>Onboard Restaurant</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- EDIT DIALOG --- */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Restaurant Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Restaurant Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Slug (URL Identifier)</Label>
              <Input
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Contact Email</Label>
              <Input
                value={formData.contactEmail}
                onChange={(e) =>
                  setFormData({ ...formData, contactEmail: e.target.value })
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleUpdateRestaurant}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- CREATE USER DIALOG (Generic for Admin/Kitchen/Supervisor) --- */}
      <Dialog open={isUserOpen} onOpenChange={setIsUserOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {/* 5. Update Title */}
              Create{" "}
              {targetRole === "admin"
                ? "Admin"
                : targetRole === "supervisor"
                  ? "Supervisor"
                  : "Kitchen"}{" "}
              Staff
            </DialogTitle>
            <DialogDescription>
              {/* 5. Update Description */}
              Create{" "}
              {targetRole === "admin"
                ? "the primary admin"
                : targetRole === "supervisor"
                  ? "a supervisor"
                  : "kitchen staff"}{" "}
              account for <b>{selectedRest?.name}</b>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Full Name</Label>
              <Input
                value={userForm.fullName}
                onChange={(e) =>
                  setUserForm({ ...userForm, fullName: e.target.value })
                }
                placeholder={
                  targetRole === "admin"
                    ? "Manager Name"
                    : targetRole === "supervisor"
                      ? "Supervisor Name"
                      : "Chef Name"
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Email</Label>
              <Input
                value={userForm.email}
                onChange={(e) =>
                  setUserForm({ ...userForm, email: e.target.value })
                }
                placeholder={
                  targetRole === "admin"
                    ? "admin@restaurant.com"
                    : targetRole === "supervisor"
                      ? "supervisor@restaurant.com"
                      : "chef@restaurant.com"
                }
              />
            </div>
            <div className="grid gap-2">
              <Label>Username</Label>
              <Input
                type="text"
                value={userForm.username}
                onChange={(e) =>
                  setUserForm({ ...userForm, username: e.target.value })
                }
                placeholder={
                  targetRole === "admin"
                    ? "rest_admin"
                    : targetRole === "supervisor"
                      ? "rest_super"
                      : "rest_chef"
                }
                minLength={3}
              />
            </div>
            <div className="grid gap-2">
              <Label>Password</Label>
              <Input
                type="password"
                value={userForm.password}
                onChange={(e) =>
                  setUserForm({ ...userForm, password: e.target.value })
                }
                placeholder="••••••••"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleCreateUser}>Create Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
