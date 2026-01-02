// app/login/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UtensilsCrossed } from "lucide-react";
import { useAuth } from "@/hooks/use-auth"; // keep your existing hook path

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isKitchen, setIsKitchen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { adminLogin } = useAuth(); // expects this from your hook
  const { toast } = useToast();
  const router = useRouter();

  // --- FIX: Use NEXT_PUBLIC_API_URL consistently ---
  const API_BASE = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
  ).replace(/\/$/, "");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const role = isKitchen ? "kitchen" : "admin";

      // --- FIX: Ensure the API path is correct ---
      const res = await fetch(`${API_BASE}/auth/login`, {
        // Removed redundant /api/v1
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role, // send role so backend can validate/authorize if needed
        }),
      });

      const payload = await res.json();

      if (!res.ok || !payload?.success) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description:
            payload?.message || "Invalid credentials. Please try again.",
        });
        setIsSubmitting(false);
        return;
      }

      const { user, accessToken, refreshToken } = payload.data || {};

      if (!user || !accessToken) {
        toast({
          variant: "destructive",
          title: "Login error",
          description: "Server response missing token or user.",
        });
        setIsSubmitting(false);
        return;
      }

      // If your backend returns the user's role, ensure it matches selected role
      if (user.role && user.role !== role) {
        toast({
          variant: "destructive",
          title: "Role mismatch",
          description: `Login failed: You selected ${role} but your account is ${user.role}.`,
        });
        setIsSubmitting(false);
        return;
      }

      // --- THIS IS THE KEY FIX ---
      // 1. Call adminLogin to update the context AND localStorage
      // We assume adminLogin stores tokens in localStorage internally
      if (typeof adminLogin === "function") {
        const loginSuccess = await adminLogin(user, accessToken, refreshToken);
        if (loginSuccess === false) {
          // Handle if adminLogin explicitly fails
          toast({
            variant: "destructive",
            title: "Login error",
            description: "Failed to update auth context.",
          });
          setIsSubmitting(false);
          return;
        }
      } else {
        // Fallback if adminLogin isn't provided (though it should be)
        localStorage.setItem("accessToken", accessToken);
        if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("adminUser", JSON.stringify(user));
      }
      // --- END FIX ---

      toast({
        title: "Login successful",
        description: `Welcome, ${user.fullName || user.username || user.email}`,
      });

      // 2. NOW redirect. The useAuth hook is updated, so the layout won't redirect back.
      const targetSlug = user.restaurantSlug || "platekhata"; // Fallback if missing
      if (isKitchen) {
        router.replace(`/${targetSlug}/kitchen`);
      } else {
        router.replace(`/${targetSlug}/dashboard`);
      }
    } catch (err: any) {
      console.error("Login error:", err);
      toast({
        variant: "destructive",
        title: "Network error",
        description: err?.message || "Please try again later.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleLogin}>
          <CardHeader className="text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
              <UtensilsCrossed className="h-8 w-8 text-primary" />
              <span className="text-2xl font-headline">PlateKhata</span>
            </div>
            <CardTitle>Admin Login</CardTitle>
            <CardDescription>
              Enter your credentials to access the dashboard.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="********"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {/* Checkbox to choose between Admin (unchecked) and Kitchen (checked) */}
            <div className="flex items-center gap-2">
              <input
                id="roleKitchen"
                type="checkbox"
                checked={isKitchen}
                onChange={(e) => setIsKitchen(e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <Label htmlFor="roleKitchen" className="mb-0 select-none">
                Kitchen Staff
              </Label>
            </div>
          </CardContent>

          <CardFooter>
            <Button className="w-full" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging in..." : "Login"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
