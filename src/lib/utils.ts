import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { startOfDay, endOfDay, format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper to convert Fake Local Date (from date-fns helpers) to Absolute IST Epoch
function toEpoch(fakeLocal: Date): number {
  const iso = format(fakeLocal, "yyyy-MM-dd'T'HH:mm:ss.SSS") + "+05:30";
  return new Date(iso).getTime();
}

export function getISTPeriodEpochRange(period: 'daily' | 'weekly' | 'monthly' | 'all-time'): { start: number; end: number } {
  if (period === 'daily') {
    return getISTDayRange();
  }
  
  const nowFake = toISTDisplayDate(Date.now());
  
  if (period === 'weekly') {
    return {
      start: toEpoch(startOfWeek(nowFake, { weekStartsOn: 1 })),
      end: toEpoch(endOfWeek(nowFake, { weekStartsOn: 1 })),
    };
  }
  
  if (period === 'monthly') {
    return { 
      start: toEpoch(startOfMonth(nowFake)), 
      end: toEpoch(endOfMonth(nowFake)) 
    };
  }
  
  // All Time (Yearly view usually)
  return { 
      start: toEpoch(startOfYear(nowFake)), 
      end: toEpoch(endOfYear(nowFake)) 
  };
}

/**
 * Returns a Date object representing the current time in IST (Indian Standard Time).
 * This works by taking the current UTC time, adding the IST offset (+5:30),
 * and creating a new Date object that *looks* like that time in the local timezone context.
 * 
 * This is crucial for "Today" filters to work correctly regardless of the user's device timezone.
 */
export function getISTDate(): Date {
  const now = new Date();
  
  // Get current time in Jakarta/Kolkata (IST is Asia/Kolkata)
  // We use the Intl API to get the components of the time in IST
  const options: Intl.DateTimeFormatOptions = {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false
  };

  const formatter = new Intl.DateTimeFormat("en-US", options);
  const parts = formatter.formatToParts(now);
  
  const year = parseInt(parts.find(p => p.type === "year")?.value || "0");
  const month = parseInt(parts.find(p => p.type === "month")?.value || "0") - 1; // JS months are 0-indexed
  const day = parseInt(parts.find(p => p.type === "day")?.value || "0");
  const hour = parseInt(parts.find(p => p.type === "hour")?.value || "0");
  const minute = parseInt(parts.find(p => p.type === "minute")?.value || "0");
  const second = parseInt(parts.find(p => p.type === "second")?.value || "0");

  // Create a "Local" date object that has the same components as the IST time
  return new Date(year, month, day, hour, minute, second);
}

// Helper to get absolute epoch range for the IST day of a given timestamp (or now)
export function getISTDayRange(epoch = Date.now()): { start: number; end: number } {
  // 1. Get the IST string for the given epoch
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date(epoch));
  const year = parts.find(p => p.type === 'year')?.value;
  const month = parts.find(p => p.type === 'month')?.value;
  const day = parts.find(p => p.type === 'day')?.value;

  // 2. Construct ISO strings for Start/End of that IST day with explicit offset
  const dateStr = `${year}-${month}-${day}`;
  const startISO = `${dateStr}T00:00:00.000+05:30`;
  const endISO = `${dateStr}T23:59:59.999+05:30`;

  // 3. Return absolute timestamps
  return {
    start: new Date(startISO).getTime(),
    end: new Date(endISO).getTime(),
  };
}

// Helper to convert an absolute epoch to a "Fake Local" Date object
// that matches IST time components. Use this ONLY for formatting with date-fns 
// (e.g. format(date, "HH:mm") will output IST time).
export function toISTDisplayDate(epoch: number | string): Date {
  const ts = Number(epoch);
  if (isNaN(ts)) return new Date(); // Fallback to now if invalid

  // Convert absolute epoch to IST components
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', second: 'numeric',
    hour12: false
  });
  
  const parts = formatter.formatToParts(new Date(ts));
  
  const get = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0');
  
  // Create Date using local browser methods but injected with IST values
  return new Date(
    get('year'), 
    get('month') - 1, 
    get('day'), 
    get('hour'), 
    get('minute'), 
    get('second')
  );
}

export function getISTStartOfDay(): Date {
  return startOfDay(getISTDate());
}

export function getISTEndOfDay(): Date {
  return endOfDay(getISTDate());
}

