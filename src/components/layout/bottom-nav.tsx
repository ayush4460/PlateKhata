// src/components/layout/bottom-nav.tsx
'use client';

import Link from 'next/link';
import { Home, ShoppingCart, ListOrdered } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useCart } from '@/hooks/use-cart';
import { Badge } from '@/components/ui/badge';

const navItems = [
  { href: '/cart', label: 'Cart', icon: ShoppingCart },
  { href: '/', label: 'Home', icon: Home },
  { href: '/orders', label: 'My Orders', icon: ListOrdered },
];

export function BottomNav() {
  const pathname = usePathname();
  const { cart } = useCart();
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-20 bg-background border-t shadow-lg md:hidden z-50">
      <div className="flex justify-around items-center h-full max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          const isCart = item.label === 'Cart';

          if (item.label === 'Home') {
            return (
              <Link href={item.href} key={item.href} className="flex-1 flex justify-center">
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center -mt-8 border-4 border-background shadow-lg">
                  <Icon className="w-8 h-8 text-primary-foreground" />
                </div>
              </Link>
            );
          }

          return (
            <Link href={item.href} key={item.href} className="flex-1">
              <div
                className={cn(
                  'flex flex-col items-center justify-center gap-1 text-muted-foreground transition-colors relative',
                  isActive && 'text-primary'
                )}
              >
                {isCart && cartItemCount > 0 && (
                  <Badge className="absolute -top-1 right-3 h-5 w-5 flex items-center justify-center p-0">{cartItemCount}</Badge>
                )}
                <Icon className="w-6 h-6" />
                <span className="text-xs font-medium">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
