/** 125000 -> "₹1,25,000", 15.5 -> "₹15.50" (Indian grouping). Negative keeps the sign in front. */
export function rupees(n: number): string {
  const abs = Math.abs(n);
  const paise = Math.round(abs * 100) % 100 !== 0;
  const text = abs.toLocaleString("en-IN", { minimumFractionDigits: paise ? 2 : 0, maximumFractionDigits: 2 });
  return `${n < 0 ? "-" : ""}₹${text}`;
}

/** "2026-11" -> "November 2026" */
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Date(y, m - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

/** "2026-11-17" -> "17 Nov" */
export function dayLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleString("en-IN", { day: "numeric", month: "short" });
}

/** "2026-11-17" -> "Tue, 17 November 2026" */
export function fullDateLabel(date: string): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "long", year: "numeric" });
}

/** Parse a typed amount like "15", "15.5" or "1,250.75". Returns null unless it is above 0 with at most 2 decimals. */
export function parseAmount(text: string): number | null {
  const clean = text.replace(/[,\s₹]/g, "");
  if (!/^\d+(\.\d{0,2})?$|^\.\d{1,2}$/.test(clean)) return null;
  const n = Number(clean);
  return n > 0 ? n : null;
}

/** Keep only what an amount box accepts: digits and one dot with up to 2 decimals. */
export function cleanAmountInput(text: string): string {
  const s = text.replace(/[^\d.]/g, "");
  const [whole = "", ...rest] = s.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
}
