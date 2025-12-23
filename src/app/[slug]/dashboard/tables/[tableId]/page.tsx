"use client";

import { TableDetails } from "@/components/dashboard/table-details";

interface PageProps {
  params: { slug: string; tableId: string };
}

export default function TableOrderPage({ params }: PageProps) {
  return <TableDetails tableId={params.tableId} slug={params.slug} />;
}
