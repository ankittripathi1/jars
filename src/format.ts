import type { CSSProperties } from "react";

// Made once. toLocaleString builds a new formatter on every call, which adds up in long lists.
const WHOLE = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });
const PAISE = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const MONTH = new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" });
const DAY = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" });
const FULL_DATE = new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });

/** 125000 -> "₹1,25,000", 15.5 -> "₹15.50" (Indian grouping). Negative keeps the sign in front. */
export function rupees(n: number): string {
  const abs = Math.abs(n);
  const paise = Math.round(abs * 100) % 100 !== 0;
  const text = (paise ? PAISE : WHOLE).format(abs);
  return `${n < 0 ? "-" : ""}₹${text}`;
}

/** "2026-11" -> "November 2026" */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return MONTH.format(new Date(y, m - 1, 1));
}

/** "2026-11-17" -> "17 Nov" */
export function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return DAY.format(new Date(y, m - 1, d));
}

/** "2026-11-17" -> "Tue, 17 November 2026" */
export function fullDateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return FULL_DATE.format(new Date(y, m - 1, d));
}

/** Parse a typed amount like "15", "15.5" or "1,250.75". Returns null unless it is above 0 with at most 2 decimals. */
export function parseAmount(text: string): number | null {
  const clean = text.replace(/[,\s₹]/g, "");
  if (!/^\d+(\.\d{0,2})?$|^\.\d{1,2}$/.test(clean)) return null;
  const n = Number(clean);
  return n > 0 ? n : null;
}

/**
 * Width for the big amount input on browsers without field-sizing (Safari before 26.2).
 * Use as style={amountWidth(value)}. styles.css drops it where field-sizing works.
 */
export function amountWidth(value: string) {
  return { "--len": Math.max(1, value.length) } as CSSProperties;
}

/** Keep only what an amount box accepts: digits and one dot with up to 2 decimals. */
export function cleanAmountInput(text: string): string {
  const s = text.replace(/[^\d.]/g, "");
  const [whole = "", ...rest] = s.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
}
