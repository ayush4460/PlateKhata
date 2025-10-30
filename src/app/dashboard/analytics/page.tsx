import { SalesChart } from '@/components/dashboard/sales-chart';
import { StatsCards } from '@/components/dashboard/stats-cards';

export default function AnalyticsPage() {
  return (
    <div className="grid auto-rows-max items-start gap-4 md:gap-8">
        <h1 className="text-2xl font-bold">Analytics</h1>
        <StatsCards />
        <SalesChart />
    </div>
  );
}
