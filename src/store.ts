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

/** Light shape check for loaded or restored data. Returns null if it doesn't look like ours. */
export function parseData(text: string): Data | null {
  try {
    const d = JSON.parse(text) as Partial<Data>;
    if (d.version !== 1 || !d.settings || !Array.isArray(d.spends) || !Array.isArray(d.friends)) return null;
    return { ...defaultData(), ...d } as Data;
  } catch {
    return null;
  }
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
