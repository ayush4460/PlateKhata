// src/app/page.tsx
"use client";

import { Suspense } from "react";
import { MenuContent } from "@/components/menu/menu-content";

export default function MenuPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-background">
          <p>Loading Menu...</p>
        </div>
      }
    >
      <MenuContent />
    </Suspense>
  );
}
