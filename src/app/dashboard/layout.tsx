// src/app/dashboard/layout.tsx
'use client';

import { usePathname, useRouter } from 'next/navigation';
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
} from '@/components/ui/sidebar';
import { Home, ListOrdered, BarChart, UtensilsCrossed, ClipboardEdit, QrCode } from 'lucide-react';
import Link from 'next/link';
import { SidebarLogoutButton } from '@/components/auth/logout-button';
import { ThemeToggle } from '@/components/layout/theme-toggle';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth'; // keep your existing hook path

const menuItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/dashboard/orders', label: 'Orders', icon: ListOrdered },
  { href: '/dashboard/menu-editor', label: 'Menu', icon: ClipboardEdit },
  { href: '/dashboard/analytics', label: 'Analytics', icon: BarChart },
  { href: '/dashboard/qr-generator', label: 'QR Codes', icon: QrCode },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const { adminUser, isAuthLoading } = useAuth();

  // local check for stored session (avoid redirecting if tokens/user exist in storage)
  const [hasLocalSession, setHasLocalSession] = useState<boolean | null>(null);

  useEffect(() => {
    // check localStorage for session presence on client side
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('adminUser') : null;
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
        router.replace('/login');
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
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  className="h-10 justify-start"
                >
                  <Link href={item.href}>
                    <item.icon className="h-5 w-5" />
                    {item.label}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
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
