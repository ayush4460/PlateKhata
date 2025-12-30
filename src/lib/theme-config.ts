// src/lib/theme-config.ts

// Mapped to match the new Warm/Orange Palette
export const CHART_COLORS = {
  pie: [
    "hsl(var(--chart-pie-1))", // Primary Orange
    "hsl(var(--chart-pie-2))", // Lighter Orange
    "hsl(var(--chart-pie-3))", // Gold/Yellow
    "hsl(var(--chart-pie-4))", // Red-Orange
    "#8884d8" 
  ],
  onlineSales: "hsl(var(--chart-online))"
};

export const RECEIPT_THEME = {
  // Very light cream/white for header
  headerBackground: [255, 253, 245] as [number, number, number], 
  // Deep Burnt Orange for Brand Text
  brandText: [234, 88, 12] as [number, number, number],          
  // Dark Gray for Subtext
  subText: [60, 60, 60] as [number, number, number],             
  // Orange Accent
  accent: [234, 88, 12] as [number, number, number],             
  
  boxFill: [255, 255, 255] as [number, number, number],          
  boxBorder: [251, 211, 141] as [number, number, number], // Light Orange Border
  
  tableHeaderFill: [255, 247, 237] as [number, number, number],
  tableHeaderText: [154, 52, 18] as [number, number, number],
  tableRowFill: [255, 255, 255] as [number, number, number],
};