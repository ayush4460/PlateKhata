"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { UtensilsCrossed, ChefHat, ArrowRight, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

// --- Reusable Login Form Component ---
interface LoginFormProps {
  role: "admin" | "kitchen";
  onBack: (e: React.MouseEvent) => void;
}

function LoginForm({ role, onBack }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { adminLogin } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const API_BASE = (
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1"
  ).replace(/\/$/, "");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
          role,
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
        throw new Error("Server response missing token or user.");
      }

      if (user.role && user.role !== role) {
        toast({
          variant: "destructive",
          title: "Role mismatch",
          description: `Login failed: You selected ${role} but your account is ${user.role}.`,
        });
        setIsSubmitting(false);
        return;
      }

      if (typeof adminLogin === "function") {
        const loginSuccess = await adminLogin(user, accessToken, refreshToken);
        if (loginSuccess === false) {
          toast({
            variant: "destructive",
            title: "Login error",
            description: "Failed to update auth context.",
          });
          setIsSubmitting(false);
          return;
        }
      } else {
        localStorage.setItem("accessToken", accessToken);
        if (refreshToken) localStorage.setItem("refreshToken", refreshToken);
        localStorage.setItem("adminUser", JSON.stringify(user));
      }

      toast({
        title: "Login successful",
        description: `Welcome, ${user.fullName || user.username || user.email}`,
      });

      const targetSlug = user.restaurantSlug || "platekhata";
      if (role === "kitchen") {
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
      setIsSubmitting(false);
    }
  };

  const isDark = role === "admin"; // Admin side is dark, Kitchen side is lighter/warmer

  return (
    <div className="w-full max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div
        className={cn(
          "flex w-full mb-6",
          role === "admin" ? "justify-end" : "justify-start"
        )}
      >
        <Button
          variant="ghost"
          onClick={(e) => {
            e.stopPropagation();
            onBack(e);
          }}
          className={cn(
            "flex items-center gap-2 transition-all duration-300 font-bold tracking-wide relative z-50 rounded-full px-4 py-2 border",
            // Both roles now use black text initially for visibility against light page content
            // Admin: Hover -> Black Bg, White Text
            // Kitchen: Hover -> Orange/Neutral Bg
            role === "admin"
              ? "text-black border-black/10 bg-white hover:bg-black hover:text-white shadow-lg shadow-black/50"
              : "text-black border-black/10 bg-white hover:bg-black hover:text-white shadow-lg shadow-black/50"
          )}
        >
          {role === "kitchen" && <ArrowLeft className="h-4 w-4 mr-1" />}
          Back to Role Selection
          {role === "admin" && <ArrowRight className="h-4 w-4 ml-1" />}
        </Button>
      </div>

      <Card
        className={cn(
          "border-0 shadow-2xl overflow-hidden backdrop-blur-xl transition-all duration-500 hover:shadow-3xl",
          "bg-white/90 text-neutral-900 ring-1 ring-black/5" // Unified Light Theme
        )}
      >
        <CardHeader className="space-y-1 text-center pb-8 pt-10">
          <div className="flex justify-center mb-6">
            <div
              className={cn(
                "p-4 rounded-full transition-transform duration-500 hover:rotate-12 hover:scale-110",
                "bg-orange-100 text-orange-600 ring-2 ring-orange-200 shadow-[0_0_20px_rgba(234,88,12,0.15)]" // Unified Icon Style
              )}
            >
              {role === "admin" ? (
                <UtensilsCrossed className="h-10 w-10" />
              ) : (
                <ChefHat className="h-10 w-10" />
              )}
            </div>
          </div>
          <CardTitle className="text-3xl font-extrabold tracking-tight">
            {role === "admin" ? "Admin Portal" : "Kitchen Station"}
          </CardTitle>
          <CardDescription className="text-base font-medium text-neutral-500">
            Enter your credentials to access the{" "}
            {role === "admin" ? "dashboard" : "kitchen panel"}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2 group">
              <Label
                htmlFor="email"
                className="block text-sm font-semibold transition-colors duration-300 group-hover:text-primary text-neutral-700"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder={
                  role === "admin"
                    ? "admin@platekhata.com"
                    : "chef@platekhata.com"
                }
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={cn(
                  "h-12 border transition-all duration-300 focus:scale-[1.01] focus:ring-2 focus:ring-primary/50",
                  "hover:border-primary/50 hover:shadow-md",
                  "bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:bg-white" // Unified Input Style
                )}
              />
            </div>
            <div className="space-y-2 group">
              <Label
                htmlFor="password"
                className="block text-sm font-semibold transition-colors duration-300 group-hover:text-primary text-neutral-700"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={cn(
                  "h-12 border transition-all duration-300 focus:scale-[1.01] focus:ring-2 focus:ring-primary/50",
                  "hover:border-primary/50 hover:shadow-md",
                  "bg-neutral-50 border-neutral-200 text-neutral-900 placeholder:text-neutral-400 focus:bg-white" // Unified Input Style
                )}
              />
            </div>
            <Button
              className={cn(
                "w-full h-12 text-lg font-bold mt-6 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg",
                "bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white border-0"
              )}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Logging in..." : "Login"}{" "}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Main Page Component ---
export default function LoginPage() {
  const [activePanel, setActivePanel] = useState<"admin" | "kitchen" | null>(
    null
  );

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden relative">
      {/* Container */}
      <div className="flex w-full h-full flex-col lg:flex-row transition-all duration-700 ease-in-out">
        {/* === ADMIN PANEL (LEFT) === */}
        <div
          onClick={() => setActivePanel("admin")}
          className={cn(
            "relative flex flex-col items-center justify-center p-8 transition-[width,flex-grow,opacity] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] cursor-pointer group overflow-hidden border-b-4 lg:border-b-0 lg:border-r-4 border-black z-10",
            activePanel === "admin"
              ? "flex-grow-[10] cursor-default lg:w-3/4"
              : activePanel === "kitchen"
              ? "flex-grow-[1] lg:w-1/12 opacity-80 hover:opacity-90"
              : "flex-grow lg:w-1/2 hover:flex-grow-[1.2]",
            // Mobile sizing
            activePanel === "admin"
              ? "h-3/4 lg:h-auto"
              : activePanel === "kitchen"
              ? "h-1/12 lg:h-auto"
              : "h-1/2 lg:h-auto"
          )}
        >
          {/* Bg Image for Admin */}
          <div className="absolute inset-0 bg-white z-[-1]"></div>
          <div className="absolute inset-0 bg-[url('https://plus.unsplash.com/premium_photo-1673108852141-e8c3c22a4a22?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')] bg-cover bg-center opacity-20 mix-blend-multiply transition-transform duration-1000 group-hover:scale-105"></div>

          {/* Content Wrapper */}
          <div
            className={cn(
              "transition-all duration-500",
              activePanel === "admin"
                ? "w-full max-w-xl"
                : "pointer-events-none"
            )}
          >
            {activePanel === "admin" ? (
              <LoginForm
                role="admin"
                onBack={(e) => {
                  e?.stopPropagation();
                  setActivePanel(null);
                }}
              />
            ) : (
              <div
                className={cn(
                  "text-center space-y-6 transition-all duration-500",
                  activePanel === "kitchen"
                    ? "opacity-0 lg:opacity-100 lg:rotate-90 lg:whitespace-nowrap transform origin-center lg:-translate-x-6"
                    : "opacity-100"
                )}
              >
                <div className="inline-flex p-4 rounded-full bg-neutral-100 ring-4 ring-black group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-neutral-200">
                  <UtensilsCrossed className="h-12 w-12 text-black" />
                </div>
                <div
                  className={cn(activePanel === "kitchen" && "hidden lg:block")}
                >
                  <h2 className="text-3xl lg:text-4xl font-bold text-black tracking-tighter transition-colors">
                    Admin Panel
                  </h2>
                  <p className="text-black/80 mt-2 font-medium tracking-wide">
                    Manage Restaurant & Orders
                  </p>
                </div>
                {activePanel !== "kitchen" && (
                  <Button
                    variant="outline"
                    className="mt-8 rounded-full px-8 border-black text-white bg-black hover:bg-neutral-800 hover:text-white hover:border-black transition-all font-semibold"
                  >
                    Login as Admin <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* === KITCHEN PANEL (RIGHT) === */}
        <div
          onClick={() => setActivePanel("kitchen")}
          className={cn(
            "relative flex flex-col items-center justify-center p-8 transition-[width,flex-grow,opacity] duration-700 ease-[cubic-bezier(0.25,1,0.5,1)] cursor-pointer group overflow-hidden bg-orange-50/50",
            activePanel === "kitchen"
              ? "flex-grow-[10] cursor-default lg:w-3/4"
              : activePanel === "admin"
              ? "flex-grow-[1] lg:w-1/12 opacity-80 hover:opacity-90"
              : "flex-grow lg:w-1/2 hover:flex-grow-[1.2]",
            // Mobile sizing
            activePanel === "kitchen"
              ? "h-3/4 lg:h-auto"
              : activePanel === "admin"
              ? "h-1/12 lg:h-auto"
              : "h-1/2 lg:h-auto"
          )}
        >
          {/* Bg Image for Kitchen */}
          <div className="absolute inset-0 bg-orange-50/80 z-[-1]"></div>
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1920')] bg-cover bg-center opacity-40 mix-blend-multiply transition-transform duration-1000 group-hover:scale-105"></div>

          {/* Content Wrapper */}
          <div
            className={cn(
              "transition-all duration-500",
              activePanel === "kitchen"
                ? "w-full max-w-xl"
                : "pointer-events-none"
            )}
          >
            {activePanel === "kitchen" ? (
              <LoginForm
                role="kitchen"
                onBack={(e) => {
                  e?.stopPropagation();
                  setActivePanel(null);
                }}
              />
            ) : (
              <div
                className={cn(
                  "text-center space-y-6 transition-all duration-500",
                  activePanel === "admin"
                    ? "opacity-0 lg:opacity-100 lg:-rotate-90 lg:whitespace-nowrap transform origin-center lg:translate-x-6"
                    : "opacity-100"
                )}
              >
                <div className="inline-flex p-4 rounded-full bg-white ring-4 ring-black group-hover:scale-110 transition-transform duration-500 shadow-xl shadow-orange-200">
                  <ChefHat className="h-12 w-12 text-black" />
                </div>
                <div
                  className={cn(activePanel === "admin" && "hidden lg:block")}
                >
                  <h2 className="text-3xl lg:text-4xl font-bold text-black tracking-tighter transition-colors">
                    Kitchen Panel
                  </h2>
                  <p className="text-black/80 mt-2 font-medium tracking-wide">
                    View & Prepare Orders
                  </p>
                </div>
                {activePanel !== "admin" && (
                  <Button
                    variant="outline"
                    className="mt-8 rounded-full px-8 border-black text-white bg-black hover:bg-neutral-800 hover:text-white hover:border-black transition-all font-semibold"
                  >
                    Login as Kitchen <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
