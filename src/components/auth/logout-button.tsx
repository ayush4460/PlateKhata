// src/components/auth/logout-button.tsx
"use client";

import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useSidebar, SidebarMenuButton } from "@/components/ui/sidebar";

export function LogoutButton() {
  const { logout } = useAuth();

  // For use in regular layouts
  return (
    <Button variant="ghost" onClick={logout}>
      <LogOut className="mr-2 h-4 w-4" />
      Logout
    </Button>
  );
}

// Special version for sidebars
export function SidebarLogoutButton() {
  const { logout } = useAuth();
  const { open } = useSidebar();
  return (
    <SidebarMenuButton onClick={logout} tooltip="Logout">
      <LogOut />
      {open && <span>Logout</span>}
    </SidebarMenuButton>
  );
}
