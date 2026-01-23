"use client";

import { usePathname, useRouter, useParams } from "next/navigation";
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Home, UtensilsCrossed, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { SidebarLogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useCart } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge";

export default function SupervisorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const { adminUser, isAuthLoading } = useAuth();
  const { pastOrders, restaurantName } = useCart();

  const menuItems = [
    { href: `/${slug}/supervisor/dashboard`, label: "Dashboard", icon: Home },
    {
      href: `/${slug}/supervisor/dashboard/orders`,
      label: "Orders",
      icon: UtensilsCrossed,
    },
  ];

  // local check for stored session (avoid redirecting if tokens/user exist in storage)
  const [hasLocalSession, setHasLocalSession] = useState<boolean | null>(null);

  useEffect(() => {
    // check localStorage for session presence on client side
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;
      setHasLocalSession(!!token);
    } catch (err) {
      setHasLocalSession(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthLoading) {
      if (!adminUser && !hasLocalSession) {
        router.replace("/login");
      }
    }
  }, [isAuthLoading, adminUser, hasLocalSession, router]);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">Checking authentication...</p>
      </div>
    );
  }

  if (!adminUser && hasLocalSession === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">Initializing session...</p>
      </div>
    );
  }

  if (!adminUser && !hasLocalSession) {
    return null;
  }

  return (
    <SidebarProvider>
      <DashboardInner
        restaurantName={restaurantName}
        menuItems={menuItems}
        pathname={pathname}
        slug={slug}
      >
        {children}
      </DashboardInner>
    </SidebarProvider>
  );
}

function DashboardInner({
  children,
  restaurantName,
  menuItems,
  pathname,
  slug,
}: {
  children: React.ReactNode;
  restaurantName: string | null;
  menuItems: any[];
  pathname: string;
  slug: string;
}) {
  const { setOpen, open } = useSidebar();

  useEffect(() => {
    if (pathname.includes("/tables/")) {
      setOpen(false);
    }
  }, [pathname, setOpen]);

  return (
    <>
      <Sidebar
        collapsible="icon"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <SidebarHeader>
          <div className="flex items-center gap-2 font-semibold text-lg p-2">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
            {open && (
              <span className="font-headline">
                {restaurantName || "Supervisor"}
              </span>
            )}
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="gap-2 p-2">
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                  className="h-10 justify-start"
                >
                  <Link
                    href={item.href}
                    className="flex justify-between w-full"
                  >
                    <div className="flex items-center gap-2">
                      <item.icon className="h-5 w-5" />
                      {open && <span>{item.label}</span>}
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
            <SidebarMenuItem>
              <div className={cn("flex w-full", !open && "justify-center")}>
                <SidebarLogoutButton />
              </div>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-2 md:hidden" />
            <div className="flex flex-col">
              <h1 className="text-xl font-semibold">Supervisor Dashboard</h1>
              <span className="text-xs text-muted-foreground">
                {restaurantName}
              </span>
            </div>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8 bg-food-pattern bg-fixed">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
