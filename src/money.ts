// Pure money logic. No React, no storage. Everything here is unit tested.
import type { BudgetJarId, Data, ExtraJarId, FriendEntry, Income, JarId, Settings, Spend } from "./types";

export const BUDGET_JARS: { id: BudgetJarId; name: string }[] = [
  { id: "necessities", name: "Necessities" },
  { id: "freedom", name: "Financial Freedom" },
  { id: "longterm", name: "Long-term Savings" },
  { id: "education", name: "Education" },
  { id: "play", name: "Play" },
  { id: "give", name: "Give" },
];

export const EXTRA_JARS: { id: ExtraJarId; name: string }[] = [
  { id: "outside", name: "Outside jars" },
  { id: "untracked", name: "Untracked" },
];

export const ALL_JARS: { id: JarId; name: string }[] = [...BUDGET_JARS, ...EXTRA_JARS];

export function jarName(id: JarId): string {
  return ALL_JARS.find((j) => j.id === id)?.name ?? id;
}

/** "2026-11-17" -> "2026-11" */
export function monthOf(date: string): string {
  return date.slice(0, 7);
}

/** Shift a "YYYY-MM" month by n months. */
export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(y, m - 1 + n, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Round to paise so float sums like 0.1 + 0.2 stay clean. */
export const round2 = (n: number) => Math.round(n * 100) / 100;

export function jarLimit(settings: Settings, jar: BudgetJarId): number {
  return round2((settings.income * settings.shares[jar]) / 100);
}

export function sharesTotal(settings: Settings): number {
  return BUDGET_JARS.reduce((sum, j) => sum + settings.shares[j.id], 0);
}

export function spendsInMonth(spends: Spend[], month: string): Spend[] {
  return spends.filter((s) => monthOf(s.date) === month);
}

const sum = (list: { amount: number }[]) => round2(list.reduce((s, x) => s + x.amount, 0));

export type JarSummary = { id: BudgetJarId; name: string; limit: number; spent: number; left: number };

/** Limit, spent and left for each budget jar in a month. */
export function jarSummaries(data: Data, month: string): JarSummary[] {
  const monthSpends = spendsInMonth(data.spends, month);
  return BUDGET_JARS.map(({ id, name }) => {
    const limit = jarLimit(data.settings, id);
    const spent = sum(monthSpends.filter((s) => s.jar === id));
    return { id, name, limit, spent, left: round2(limit - spent) };
  });
}

/** Total spent in one jar in a month. */
export function jarSpent(data: Data, month: string, jar: JarId): number {
  return sum(spendsInMonth(data.spends, month).filter((s) => s.jar === jar));
}

/** Income minus every spend in the month, including Outside jars and Untracked. */
export function overallRemaining(data: Data, month: string): number {
  return round2(data.settings.income - sum(spendsInMonth(data.spends, month)));
}

/** Money in minus money out for every entry dated on or after `date`. Friend money counts. */
export function netSince(data: Data, date: string): number {
  const after = <T extends { date: string }>(list: T[]) => list.filter((x) => x.date >= date);
  const friends = after(data.friends);
  return round2(
    sum(after(data.incomes)) - sum(after(data.spends)) + sum(friends.filter((f) => f.type === "got")) - sum(friends.filter((f) => f.type === "gave")),
  );
}

/** Spendable money right now, or null if I never entered my real balance. */
export function balance(data: Data): number | null {
  if (!data.balanceStart) return null;
  return round2(data.balanceStart.amount + netSince(data, data.balanceStart.date));
}

/**
 * What the app thinks I should have now.
 * Before the first balance check it assumes the month started at zero plus salary.
 * (Salary counts once: either as a recorded income this month or from settings.)
 */
export function expectedBalance(data: Data, today: string): number {
  const known = balance(data);
  if (known !== null) return known;
  const month = monthOf(today);
  const salaryRecorded = data.incomes.some((i) => monthOf(i.date) === month);
  return round2((salaryRecorded ? 0 : data.settings.income) + netSince(data, `${month}-01`));
}

/** Store my real balance so that balance(data) equals `actual` today. */
export function setBalance(data: Data, actual: number, today: string): Data {
  return { ...data, balanceStart: { date: today, amount: round2(actual - netSince(data, today)) } };
}

/**
 * Balance check: if I have less than expected, the gap becomes one Untracked spend.
 * If I have more, the extra becomes an untracked Money in. Then the balance is set.
 */
export function reconcile(data: Data, actual: number, today: string, makeId: () => string): Data {
  const gap = round2(expectedBalance(data, today) - actual);
  let next = data;
  if (gap > 0) {
    next = { ...next, spends: [...next.spends, { id: makeId(), amount: gap, jar: "untracked", note: "Not sure where it went", date: today }] };
  } else if (gap < 0) {
    next = { ...next, incomes: [...next.incomes, { id: makeId(), amount: -gap, note: "Extra money found", date: today }] };
  }
  return setBalance(next, actual, today);
}

/**
 * Add a spend I just remembered that was part of the Untracked money.
 * Its amount comes out of that month's Untracked spends (newest first), so nothing is counted twice
 * and my balance stays the same. If it is bigger than what's left in Untracked, only the extra
 * lowers the balance.
 */
export function addFromUntracked(data: Data, spend: Spend): Data {
  const month = monthOf(spend.date);
  const moved = Math.min(spend.amount, jarSpent(data, month, "untracked"));
  const before = balance(data);

  let toMove = moved;
  const spends = [...data.spends];
  for (let i = spends.length - 1; i >= 0 && toMove > 0; i--) {
    const s = spends[i]!;
    if (s.jar !== "untracked" || monthOf(s.date) !== month) continue;
    const take = Math.min(s.amount, toMove);
    toMove = round2(toMove - take);
    spends[i] = { ...s, amount: round2(s.amount - take) };
  }
  const next: Data = { ...data, spends: [...spends.filter((s) => s.amount > 0), spend] };

  // Dates of the moved money can fall before or after the balance day, so fix the balance directly.
  if (before === null || !next.balanceStart) return next;
  const target = round2(before - (spend.amount - moved));
  const drift = round2(target - (balance(next) ?? target));
  return { ...next, balanceStart: { ...next.balanceStart, amount: round2(next.balanceStart.amount + drift) } };
}

/**
 * Balance per person: sum of "gave" minus sum of "got".
 * Positive = they owe me. Negative = I owe them. Sorted by name.
 */
export function friendBalances(entries: FriendEntry[]): { person: string; balance: number }[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    const delta = e.type === "gave" ? e.amount : -e.amount;
    map.set(e.person, round2((map.get(e.person) ?? 0) + delta));
  }
  return [...map.entries()]
    .map(([person, balance]) => ({ person, balance }))
    .sort((a, b) => a.person.localeCompare(b.person));
}

export function needsFixedSpends(data: Data, month: string): boolean {
  return (data.settings.fixed.length > 0 || data.settings.income > 0) && !data.fixedAddedFor.includes(month);
}

/** Adds the fixed spends and the salary (as Money in) to a month, dated the 1st. Only once per month. */
export function addFixedSpends(data: Data, month: string, makeId: () => string): Data {
  if (!needsFixedSpends(data, month)) return data;
  const date = `${month}-01`;
  const added: Spend[] = data.settings.fixed.map((f) => ({ id: makeId(), amount: f.amount, jar: f.jar, note: f.name, date }));
  const salary: Income[] = data.settings.income > 0 ? [{ id: makeId(), amount: data.settings.income, note: "Salary", date }] : [];
  return {
    ...data,
    spends: [...data.spends, ...added],
    incomes: [...data.incomes, ...salary],
    fixedAddedFor: [...data.fixedAddedFor, month],
  };
}

/** One row in the all-transactions list. */
export type HistoryItem =
  | { kind: "spend"; date: string; amount: number; item: Spend }
  | { kind: "income"; date: string; amount: number; item: Income }
  | { kind: "friend"; date: string; amount: number; item: FriendEntry };

/** Every entry in a month, newest first. Within a day, later-added entries come first. */
export function history(data: Data, month: string): HistoryItem[] {
  const inMonth = <T extends { date: string }>(list: T[]) => list.filter((x) => monthOf(x.date) === month);
  const items: HistoryItem[] = [
    ...inMonth(data.spends).map((item) => ({ kind: "spend" as const, date: item.date, amount: -item.amount, item })),
    ...inMonth(data.incomes).map((item) => ({ kind: "income" as const, date: item.date, amount: item.amount, item })),
    ...inMonth(data.friends).map((item) => ({ kind: "friend" as const, date: item.date, amount: item.type === "got" ? item.amount : -item.amount, item })),
  ];
  return items
    .map((x, i) => ({ x, i }))
    .sort((a, b) => b.x.date.localeCompare(a.x.date) || b.i - a.i)
    .map(({ x }) => x);
}

/** The last n different notes, newest first, each with the jar and amount it was last used with. */
export function recentNotes(spends: Spend[], n = 5): { note: string; jar: JarId; amount: number }[] {
  const seen = new Set<string>();
  const out: { note: string; jar: JarId; amount: number }[] = [];
  // Newer date first. For the same date, later entries in the list are newer.
  const ordered = spends
    .filter((s) => s.jar !== "untracked")
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.date.localeCompare(a.s.date) || b.i - a.i);
  for (const { s } of ordered) {
    const note = s.note.trim();
    if (!note || seen.has(note.toLowerCase())) continue;
    seen.add(note.toLowerCase());
    out.push({ note, jar: s.jar, amount: s.amount });
    if (out.length === n) break;
  }
  return out;
}
