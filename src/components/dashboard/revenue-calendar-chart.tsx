"use client";

import { useState, useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Filter, TrendingUp } from "lucide-react";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  isSameDay,
  eachDayOfInterval,
} from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

interface RevenueData {
  date: number;
  revenue: number;
}

interface RevenueCalendarChartProps {
  data: RevenueData[];
  onRangeChange: (range: DateRange | undefined) => void;
  dateRange: DateRange | undefined;
}

export function RevenueCalendarChart({
  data,
  onRangeChange,
  dateRange,
}: RevenueCalendarChartProps) {
  const chartData = useMemo(() => {
    if (!dateRange?.from || !dateRange?.to) {
      return data.map((item) => ({
        ...item,
        revenue: Number(item.revenue),
        formattedDate: format(new Date(Number(item.date)), "MMM d"),
        fullDate: format(new Date(Number(item.date)), "PP"),
      }));
    }

    const allDays = eachDayOfInterval({
      start: dateRange.from,
      end: dateRange.to,
    });

    return allDays.map((day) => {
      const dayStart = day.getTime();
      const matchingData = data.find((d) =>
        isSameDay(new Date(Number(d.date)), day)
      );

      return {
        date: dayStart,
        revenue: matchingData ? Number(matchingData.revenue) : 0,
        formattedDate: format(day, "MMM d"),
        fullDate: format(day, "PP"),
      };
    });
  }, [data, dateRange]);

  const totalRevenue = useMemo(() => {
    return data.reduce((sum, item) => sum + Number(item.revenue), 0);
  }, [data]);

  const maxRevenue = useMemo(() => {
    const vals = data.map((d) => Number(d.revenue)).filter((v) => !isNaN(v));
    return vals.length > 0 ? Math.max(...vals) : 0;
  }, [data]);

  return (
    <Card className="col-span-4 transition-all duration-300 hover:shadow-md border-none bg-gradient-to-br from-background to-secondary/10">
      <CardHeader className="flex flex-row items-center justify-between pb-7">
        <div className="space-y-1.5">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Revenue Analysis
          </CardTitle>
          <CardDescription>
            {dateRange?.from ? (
              dateRange.to ? (
                <>
                  {format(dateRange.from, "LLL dd, y")} -{" "}
                  {format(dateRange.to, "LLL dd, y")}
                </>
              ) : (
                format(dateRange.from, "LLL dd, y")
              )
            ) : (
              "Select a date range"
            )}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">
              Total Revenue
            </span>
            <span className="text-lg font-bold text-primary">
              ₹
              {totalRevenue.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
              })}
            </span>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                id="date"
                variant={"outline"}
                size="sm"
                className={cn(
                  "w-[240px] justify-start text-left font-normal bg-background/50 backdrop-blur-sm border-muted-foreground/20",
                  !dateRange && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange?.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd")} -{" "}
                      {format(dateRange.to, "LLL dd")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd")
                  )
                ) : (
                  <span>Pick a date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={onRangeChange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent className="px-2">
        <div className="h-[350px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 25, right: 30, left: 10, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop
                    offset="5%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0.3}
                  />
                  <stop
                    offset="95%"
                    stopColor="hsl(var(--primary))"
                    stopOpacity={0}
                  />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="hsl(var(--muted-foreground))"
                opacity={0.1}
              />
              <XAxis
                dataKey="formattedDate"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(val) =>
                  `₹${val >= 1000 ? (val / 1000).toFixed(1) + "k" : val}`
                }
                domain={[0, maxRevenue * 1.1]}
                ticks={[
                  0,
                  Math.round(maxRevenue * 0.25),
                  Math.round(maxRevenue * 0.5),
                  Math.round(maxRevenue * 0.75),
                  maxRevenue,
                ]}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-xl ring-1 ring-black ring-opacity-5">
                        <p className="text-xs font-bold text-muted-foreground mb-1">
                          {(payload[0].payload as any).fullDate}
                        </p>
                        <p className="text-sm font-bold text-primary">
                          ₹
                          {Number(payload[0].value).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                          })}
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorRevenue)"
                animationDuration={1500}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
