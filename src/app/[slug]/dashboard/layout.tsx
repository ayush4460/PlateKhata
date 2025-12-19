// src/app/dashboard/layout.tsx
"use client";

import { usePathname, useRouter } from "next/navigation";
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
} from "@/components/ui/sidebar";
import {
  Home,
  ListOrdered,
  BarChart,
  UtensilsCrossed,
  ClipboardEdit,
  QrCode,
  Settings,
  Tags,
  Globe, // Added
} from "lucide-react";
import Link from "next/link";
import { SidebarLogoutButton } from "@/components/auth/logout-button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth"; // keep your existing hook path
import { useCart } from "@/hooks/use-cart";
import { Badge } from "@/components/ui/badge"; // Added Badge

import { useParams } from "next/navigation"; // Added useParams

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const slug = params?.slug as string;

  const { adminUser, isAuthLoading } = useAuth();
  const { pastOrders } = useCart(); // Get orders

  const menuItems = [
    { href: `/${slug}/dashboard`, label: "Dashboard", icon: Home },
    { href: `/${slug}/dashboard/orders`, label: "Orders", icon: ListOrdered },
    { href: `/${slug}/dashboard/categories`, label: "Categories", icon: Tags },
    {
      href: `/${slug}/dashboard/menu-editor`,
      label: "Menu",
      icon: ClipboardEdit,
    },
    {
      href: `/${slug}/dashboard/analytics`,
      label: "Analytics",
      icon: BarChart,
    },
    {
      href: `/${slug}/dashboard/qr-generator`,
      label: "QR Codes",
      icon: QrCode,
    },
    {
      href: `/${slug}/dashboard/online-orders`,
      label: "Online Orders",
      icon: Globe,
    },
    { href: `/${slug}/dashboard/settings`, label: "Settings", icon: Settings },
  ];

  // local check for stored session (avoid redirecting if tokens/user exist in storage)
  const [hasLocalSession, setHasLocalSession] = useState<boolean | null>(null);

  // Calculate payment requests
  const paymentRequestCount = pastOrders.reduce((count, order) => {
    // Check if this is a unique session or order request
    // We count individual orders that are 'Requested'
    if (order.paymentStatus === "Requested") {
      return count + 1;
    }
    return count;
    // Note: If you want to group by session, you'd need more complex logic,
    // but usually showing total "items/tables" requesting is fine.
  }, 0);

  useEffect(() => {
    // check localStorage for session presence on client side
    try {
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("accessToken")
          : null;
      const storedUser =
        typeof window !== "undefined"
          ? localStorage.getItem("adminUser")
          : null;
      setHasLocalSession(!!token && !!storedUser);
    } catch (err) {
      setHasLocalSession(false);
    }
  }, []);

  useEffect(() => {
    // Only redirect if:
    // - auth finished loading
    // - there is no user in context
    // - AND there's no persisted session in localStorage
    if (!isAuthLoading) {
      if (!adminUser && !hasLocalSession) {
        router.replace("/login");
      } else {
      }
    }
  }, [isAuthLoading, adminUser, hasLocalSession, router]);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">Checking authentication…</p>
      </div>
    );
  }

  // If no adminUser and still deciding about local session, show loader to avoid flicker
  if (!adminUser && hasLocalSession === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">Initializing session…</p>
      </div>
    );
  }

  // If no adminUser and no local session, redirect is in progress — render nothing.
  if (!adminUser && !hasLocalSession) {
    return null;
  }

  // At this point either adminUser exists or localStorage has session — render UI.
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 font-semibold text-lg p-2">
            <UtensilsCrossed className="h-6 w-6 text-primary" />
            <span className="font-headline">Axios</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu className="gap-2 p-2">
            {menuItems.map((item) => {
              const isOrders = item.label === "Orders";
              const showBadge = isOrders && paymentRequestCount > 0;

              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    className={
                      showBadge
                        ? "text-red-500 font-bold hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                        : "h-10 justify-start"
                    }
                  >
                    <Link
                      href={item.href}
                      className="flex justify-between w-full"
                    >
                      <div className="flex items-center gap-2">
                        <item.icon
                          className={
                            showBadge
                              ? "h-5 w-5 text-red-500 animate-pulse"
                              : "h-5 w-5"
                          }
                        />
                        {item.label}
                      </div>
                      {showBadge && (
                        <Badge
                          variant="destructive"
                          className="ml-auto h-5 min-w-5 flex items-center justify-center px-1"
                        >
                          {paymentRequestCount}
                        </Badge>
                      )}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
            <SidebarMenuItem>
              <SidebarLogoutButton />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-xl font-semibold">Admin Dashboard</h1>
          </div>
          <ThemeToggle />
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
