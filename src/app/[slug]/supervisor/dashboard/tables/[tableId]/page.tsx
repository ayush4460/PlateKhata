"use client";

import { TableDetails } from "@/components/dashboard/table-details";
import { use } from "react";

interface PageProps {
  params: Promise<{ slug: string; tableId: string }>;
}

export default function SupervisorTableOrderPage({ params }: PageProps) {
  const unwrappedParams = use(params);
  return (
    <TableDetails
      tableId={unwrappedParams.tableId}
      slug={unwrappedParams.slug}
      backUrl={`/${unwrappedParams.slug}/supervisor/dashboard`}
    />
  );
}
