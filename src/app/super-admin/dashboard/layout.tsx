"use strict";
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LogOut, LayoutDashboard, Utensils, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const token = localStorage.getItem("platformToken");
    if (!token) {
      router.replace("/super-admin/login");
    }
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("platformToken");
    localStorage.removeItem("platformUser");
    router.replace("/super-admin/login");
  };

  if (!mounted) return null;

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            PlateKhata
          </h1>
          <p className="text-xs text-neutral-500 uppercase tracking-widest mt-1">
            Super Admin
          </p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 mb-1",
              pathname === "/super-admin/dashboard" &&
                "bg-neutral-100 font-semibold",
            )}
            onClick={() => router.push("/super-admin/dashboard")}
          >
            <LayoutDashboard className="w-4 h-4" />
            Restaurants
          </Button>
          {/* Future Links
          <Button variant="ghost" className="w-full justify-start gap-3">
             <Settings className="w-4 h-4" />
             Settings
          </Button>
          */}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8">{children}</main>
    </div>
  );
}
