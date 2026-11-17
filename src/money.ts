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

/**
 * What's left of this month's plan: income minus every spend, minus live Untracked money.
 * Outside jars and stored Untracked entries count as spends.
 */
export function overallRemaining(data: Data, month: string): number {
  return round2(data.settings.income - sum(spendsInMonth(data.spends, month)) - untracked(data, month));
}

/** Money in minus money out for entries dated in [from, to]. Friend money counts. */
function net(data: Data, from: string, to: string, opts: { skipUntrackedSpends: boolean }): number {
  const inRange = <T extends { date: string }>(list: T[]) => list.filter((x) => x.date >= from && x.date <= to);
  const spends = inRange(data.spends).filter((s) => !(opts.skipUntrackedSpends && s.fromUntracked));
  const friends = inRange(data.friends);
  return round2(sum(inRange(data.incomes)) - sum(spends) + sum(friends.filter((f) => f.type === "got")) - sum(friends.filter((f) => f.type === "gave")));
}

const END = "9999-12-31";
const lastDay = (month: string) => `${month}-31`; // string compare: every real date in the month is <= "-31"

/**
 * Spendable money at the end of `to` (default: now), or null if I never entered my balance.
 * Spends marked "Untracked money" are old spends that were already gone, so they never move it.
 */
export function balanceThrough(data: Data, to = END): number | null {
  const b = data.balanceStart;
  if (!b) return null;
  return round2(b.amount + net(data, b.date, to, { skipUntrackedSpends: true }));
}

export function balance(data: Data): number | null {
  return balanceThrough(data);
}

/**
 * Untracked money in a month: money that left but no entry explains it. Worked out live, never stored,
 * so changing income or adding entries in any order keeps it right.
 *
 * Only the month of my balance check has it:
 *   start of month (opening + salary) + all money in/out this month − real balance at month end
 * Spends marked "Untracked money" count as spends here, so each one shrinks it.
 * Salary comes from settings unless a Money in entry was recorded that month.
 */
export function untracked(data: Data, month: string): number {
  const b = data.balanceStart;
  if (!b || monthOf(b.date) !== month) return 0;
  const salaryRecorded = data.incomes.some((i) => monthOf(i.date) === month);
  const start = b.opening + (salaryRecorded ? 0 : data.settings.income);
  const end = balanceThrough(data, lastDay(month)) ?? 0;
  return Math.max(0, round2(start + net(data, `${month}-01`, lastDay(month), { skipUntrackedSpends: false }) - end));
}

// Note on the entry that keeps an old month's Untracked money when a new month's check replaces it.
export const UNTRACKED_NOTE = "Not sure where it went";
// Note on entries made by older versions of the app (removed on load, see migrateOldChecks).
export const EXTRA_NOTE = "Extra money found";

/**
 * Store my real balance: balance(data) equals `actual` from now on.
 * A check in a new month first keeps the old month's Untracked money as a stored entry,
 * and starts the new month from the old balance (its "opening").
 */
export function setBalance(data: Data, actual: number, today: string, makeId: () => string): Data {
  const month = monthOf(today);
  const old = data.balanceStart;
  let next = data;
  let opening = 0;

  if (old && monthOf(old.date) === month) {
    opening = old.opening;
  } else if (old) {
    const oldMonth = monthOf(old.date);
    opening = balanceThrough(data, lastDay(addMonths(month, -1))) ?? 0;
    const left = untracked(data, oldMonth);
    if (left > 0) {
      const lastDate = new Date(Number(oldMonth.slice(0, 4)), Number(oldMonth.slice(5)), 0).getDate();
      const frozen: Spend = { id: makeId(), amount: left, jar: "untracked", note: UNTRACKED_NOTE, date: `${oldMonth}-${String(lastDate).padStart(2, "0")}` };
      next = { ...next, spends: [...next.spends, frozen] };
    }
  }

  const amount = round2(actual - net(next, today, END, { skipUntrackedSpends: true }));
  return { ...next, balanceStart: { date: today, amount, opening } };
}

/**
 * Older versions saved the balance-check gap as entries ("Not sure where it went" spends,
 * "Extra money found" income) in the check's month. Untracked is live now, so remove them
 * and keep the real balance the same.
 */
export function migrateOldChecks(data: Data): Data {
  const b = data.balanceStart;
  if (!b) return data;
  const month = monthOf(b.date);
  const isOldGap = (s: Spend) => s.jar === "untracked" && s.note === UNTRACKED_NOTE && monthOf(s.date) === month;
  const isOldExtra = (i: Income) => i.note === EXTRA_NOTE && monthOf(i.date) === month;
  const gaps = data.spends.filter(isOldGap);
  const extras = data.incomes.filter(isOldExtra);
  if (gaps.length === 0 && extras.length === 0) return data;
  const inWindow = <T extends { date: string }>(x: T) => x.date >= b.date;
  // Removing a spend raises net, removing income lowers it; shift the start so the balance stays.
  const shift = sum(extras.filter(inWindow)) - sum(gaps.filter(inWindow));
  return {
    ...data,
    spends: data.spends.filter((s) => !isOldGap(s)),
    incomes: data.incomes.filter((i) => !isOldExtra(i)),
    balanceStart: { ...b, amount: round2(b.amount + shift) },
  };
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
