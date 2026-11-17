// Saves all app data as one JSON object in localStorage.
import { useEffect, useState } from "react";
import type { Data } from "./types";

const KEY = "jars-data-v1";

/** Fresh app data. Income and fixed spends start empty: I fill them in Settings (the hosted code is public). */
export function defaultData(): Data {
  return {
    version: 1,
    settings: {
      income: 0,
      shares: { necessities: 55, freedom: 10, longterm: 10, education: 10, play: 10, give: 5 },
      fixed: [],
    },
    spends: [],
    incomes: [],
    friends: [],
    fixedAddedFor: [],
  };
}

/** Works without HTTPS too (crypto.randomUUID needs a secure context). */
export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

/** Today as local "YYYY-MM-DD". */
export function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const JAR_IDS = new Set<string>(["necessities", "freedom", "longterm", "education", "play", "give", "outside", "untracked"]);
const isDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);
const isAmount = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;
const text = (v: unknown) => (typeof v === "string" ? v : "");
const list = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === "object") : []);

/**
 * Reads saved or restored data. Returns null if it isn't ours.
 * Broken entries (bad amount or date) are dropped and missing fields get defaults,
 * so one bad row can never crash a screen.
 */
export function parseData(raw: string): Data | null {
  let d: Record<string, unknown>;
  try {
    d = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!d || d.version !== 1 || typeof d.settings !== "object" || d.settings === null) return null;

  const base = defaultData();
  const s = d.settings as Record<string, unknown>;
  const shares = { ...base.settings.shares };
  for (const k of Object.keys(shares) as (keyof typeof shares)[]) {
    const v = (s.shares as Record<string, unknown> | undefined)?.[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= 0) shares[k] = v;
  }
  const jar = (v: unknown) => (typeof v === "string" && JAR_IDS.has(v) ? (v as Data["spends"][number]["jar"]) : "untracked");
  const id = (v: unknown, i: number, prefix: string) => (typeof v === "string" && v ? v : `${prefix}-${i}`);

  return {
    version: 1,
    settings: {
      income: typeof s.income === "number" && Number.isFinite(s.income) && s.income >= 0 ? s.income : 0,
      shares,
      fixed: list(s.fixed)
        .filter((f) => typeof f.amount === "number" && Number.isFinite(f.amount) && f.amount >= 0)
        .map((f) => ({ name: text(f.name), amount: f.amount as number, jar: jar(f.jar) })),
    },
    spends: list(d.spends)
      .filter((x) => isAmount(x.amount) && isDate(x.date))
      .map((x, i) => ({ id: id(x.id, i, "s"), amount: x.amount as number, jar: jar(x.jar), note: text(x.note), date: x.date as string })),
    incomes: list(d.incomes)
      .filter((x) => isAmount(x.amount) && isDate(x.date))
      .map((x, i) => ({ id: id(x.id, i, "i"), amount: x.amount as number, note: text(x.note), date: x.date as string })),
    friends: list(d.friends)
      .filter((x) => isAmount(x.amount) && isDate(x.date))
      .map((x, i) => ({
        id: id(x.id, i, "f"),
        person: text(x.person).trim() || "Someone",
        amount: x.amount as number,
        type: x.type === "got" ? "got" : "gave",
        note: text(x.note),
        date: x.date as string,
      })),
    fixedAddedFor: Array.isArray(d.fixedAddedFor) ? d.fixedAddedFor.filter((m): m is string => typeof m === "string") : [],
    balanceStart: (() => {
      const b = d.balanceStart as Record<string, unknown> | undefined;
      return b && isDate(b.date) && typeof b.amount === "number" && Number.isFinite(b.amount) ? { date: b.date, amount: b.amount } : undefined;
    })(),
  };
}

function load(): Data {
  try {
    const raw = localStorage.getItem(KEY);
    return (raw && parseData(raw)) || defaultData();
  } catch {
    return defaultData();
  }
}

/** App data with auto-save. Also asks the browser not to clear our storage. */
export function useData(): [Data, (update: (d: Data) => Data) => void] {
  const [data, setData] = useState<Data>(load);

  useEffect(() => {
    void navigator.storage?.persist?.();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      // Storage full or blocked. Nothing useful to do here; backup still works.
    }
  }, [data]);

  return [data, setData];
}

export function downloadBackup(data: Data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `jars-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}
