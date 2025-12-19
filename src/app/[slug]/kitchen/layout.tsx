// src/app/kitchen/layout.tsx
'use client';

import { UtensilsCrossed } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/use-auth';

export default function KitchenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { adminUser, isAuthLoading, adminLogin } = useAuth();

  const [hasLocalSession, setHasLocalSession] = useState<boolean | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      if (typeof window === 'undefined') {
        setHasLocalSession(false);
        return;
      }
      const token = localStorage.getItem('accessToken');
      const storedUser = localStorage.getItem('adminUser');
      setHasLocalSession(!!token && !!storedUser);
    } catch (err) {
      setHasLocalSession(false);
    }
  }, []);

  useEffect(() => {
    if (hydrated) return;
    if (!adminUser && hasLocalSession) {
      try {
        const storedUserRaw = localStorage.getItem('adminUser');
        const token = localStorage.getItem('accessToken');
        if (storedUserRaw && token) {
          const storedUser = JSON.parse(storedUserRaw);
          (async () => {
            try {
              if (typeof adminLogin === 'function') {
                await adminLogin(storedUser, token);
              }
            } catch (err) {
              console.warn('Failed to hydrate auth context in KitchenLayout:', err);
            } finally {
              setHydrated(true);
            }
          })();
        } else {
          setHydrated(true);
        }
      } catch (err) {
        console.warn('Error parsing stored adminUser in KitchenLayout', err);
        setHydrated(true);
      }
    } else {
      setHydrated(true);
    }
  }, [adminUser, hasLocalSession, adminLogin, hydrated]);

  useEffect(() => {
    if (!isAuthLoading && hydrated) {
      if (!adminUser && !hasLocalSession) {
        router.replace('/login');
      }
    }
  }, [isAuthLoading, hydrated, adminUser, hasLocalSession, router]);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">Checking authentication…</p>
      </div>
    );
  }

  if (!adminUser && hasLocalSession === null) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <p className="text-muted-foreground">Initializing session…</p>
      </div>
    );
  }

  if (!adminUser && !hasLocalSession) {
    return null;
  }

  return (
    <div className="flex min-h-screen w-full flex-col">
      <header className="sticky top-0 flex h-16 items-center justify-between gap-4 border-b bg-background px-4 md:px-6 z-10">
        <div className="flex items-center gap-2 font-semibold text-lg">
          <UtensilsCrossed className="h-6 w-6 text-primary" />
          <span className="font-headline">Axios Kitchen</span>
        </div>
      </header>
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        {children}
      </main>
    </div>
  );
}
