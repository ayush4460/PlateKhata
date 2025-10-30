// src/app/kitchen/page.tsx
'use client';

import { OrderColumn } from '@/components/kitchen/order-column';
import { useCart } from '@/hooks/use-cart';
import { useEffect } from 'react';

export default function KitchenPage() {
  const { kitchenOrders, updateKitchenOrderStatus, connectSocket } = useCart();

  // Connect to Socket.IO when the kitchen page mounts
  // This ensures the kitchen gets real-time updates even if navigated to directly
  useEffect(() => {
    // connectSocket function from useCart handles checking if already connected
    connectSocket();
  }, [connectSocket]); // Dependency array ensures this runs once or if connectSocket changes

  // --- DEBUG LOG: Log the received kitchenOrders state ---
  useEffect(() => {
    console.log('[DEBUG KitchenPage] Received kitchenOrders state:', kitchenOrders);
    // You can add more detailed logs here if needed:
    // console.log('[DEBUG KitchenPage] New Orders:', kitchenOrders?.new);
    // console.log('[DEBUG KitchenPage] In Progress Orders:', kitchenOrders?.['in-progress']);
    // console.log('[DEBUG KitchenPage] Completed (Ready) Orders:', kitchenOrders?.completed);
  }, [kitchenOrders]); // Re-run log whenever kitchenOrders state changes
  // --- END DEBUG LOG ---

  return (
    // Grid layout for the three columns
    <div className="grid h-full flex-1 grid-cols-1 gap-4 md:grid-cols-3">
      {/* Column for New Orders */}
      <OrderColumn
        title="New Orders"
        status="new" // Identifier for this column
        // Pass the 'new' orders array from the hook state
        // Add fallback to empty array in case the state is temporarily undefined/null
        orders={kitchenOrders?.new || []}

        onMoveOrder={(id) => updateKitchenOrderStatus(id, 'new', 'in-progress')}
        actionText="Start Cooking"
      />

      {/* Column for Orders Being Cooked */}
      <OrderColumn
        title="Cooking"
        status="in-progress"
        orders={kitchenOrders?.['in-progress'] || []}
        onMoveOrder={(id) => updateKitchenOrderStatus(id, 'in-progress', 'completed')}
        actionText="Mark as Ready"
      />

      {/* Column for Completed/Ready Orders */}
      <OrderColumn
        title="Ready"
        status="completed" // Identifier for this column
        // Pass the 'completed' (meaning 'ready' in backend terms) orders array
        orders={kitchenOrders?.completed || []}
      />
    </div>
  );
}