import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  return (
    "₱" +
    new Intl.NumberFormat("en-PH", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.round(value))
  );
}

export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" });
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-PH", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function milestoneBadgeClass(milestone: string): string {
  if (milestone === "10% Payment") return "milestone-badge-10";
  if (milestone === "CREQ") return "milestone-badge-creq";
  return "milestone-badge-forecast";
}

export function isoWeekRange(dateStr: string): { start: string; end: string } {
  const d = new Date(dateStr);
  const day = (d.getDay() + 6) % 7; // Mon=0
  const monday = new Date(d);
  monday.setDate(d.getDate() - day);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: monday.toISOString(), end: sunday.toISOString() };
}
