// src/components/dashboard/table-status.tsx
'use client';

import { useCart } from '@/hooks/use-cart';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Armchair } from 'lucide-react';
import type { TableStatus as TableStatusType } from '@/lib/types';
import { useEffect } from 'react'; // Import useEffect for logging

export function TableStatus() {
    const { tableStatuses } = useCart();

    // --- DEBUG: Log tableStatuses when the component receives them ---
    useEffect(() => {
        console.log('[DEBUG] TableStatus component received tableStatuses:', tableStatuses);
    }, [tableStatuses]);
    // --- END DEBUG ---

    const getStatusStyles = (status: TableStatusType['status']) => {
        // ... (Keep existing style logic) ...
        switch (status) {
            case 'Empty': return 'bg-green-100 text-green-800 border-green-200';
            case 'Occupied': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'Needs Cleaning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Table Status</CardTitle>
                <CardDescription>Live overview of your restaurant tables. Status is updated automatically.</CardDescription>
            </CardHeader>
            <CardContent>
                {/* --- DEBUG: Add a check before mapping --- */}
                {Array.isArray(tableStatuses) && tableStatuses.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {tableStatuses.sort((a, b) => {
                             const numA = parseInt(a.tableNumber); const numB = parseInt(b.tableNumber);
                             if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
                             return a.tableNumber.localeCompare(b.tableNumber);
                        }).map(table => (
                            <Card key={table.id} className={cn("flex flex-col items-center justify-center p-4 aspect-square transition-all", getStatusStyles(table.status))}>
                                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                                    <Armchair className="w-8 h-8" />
                                    <p className="font-bold text-lg">Table {table.tableNumber}</p>
                                </div>
                                <Badge variant="outline" className={cn("capitalize mt-2", getStatusStyles(table.status))}>{table.status}</Badge>
                            </Card>
                        ))}
                    </div>
                ) : (
                    // --- DEBUG: Show message if array is empty ---
                    <div className="text-center py-10 text-muted-foreground">
                        Loading table statuses or no tables found...
                    </div>
                )}
                {/* --- END DEBUG --- */}
            </CardContent>
        </Card>
    )
}