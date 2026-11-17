import { describe, expect, it } from "vitest";
import {
  addFixedSpends,
  addFromUntracked,
  jarSpent,
  addMonths,
  balance,
  friendBalances,
  history,
  jarSummaries,
  overallRemaining,
  reconcile,
  recentNotes,
  redoMonthCheck,
  setBalance,
} from "./money";
import { defaultData } from "./store";
import type { Data, Spend } from "./types";

// Sample setup used by most tests: 50,000 income and 5 fixed spends.
function sample(): Data {
  const d = defaultData();
  return {
    ...d,
    settings: {
      ...d.settings,
      income: 50000,
      fixed: [
        { name: "Rent", amount: 20000, jar: "necessities" },
        { name: "Phone", amount: 300, jar: "necessities" },
        { name: "AI sub", amount: 2000, jar: "education" },
        { name: "SIP", amount: 5000, jar: "freedom" },
        { name: "Emergency fund", amount: 5000, jar: "longterm" },
      ],
    },
  };
}

let n = 0;
const id = () => `id${n++}`;

function withSpends(spends: Omit<Spend, "id">[]): Data {
  return { ...sample(), spends: spends.map((s) => ({ ...s, id: id() })) };
}

describe("jar limits", () => {
  it("come from income and shares, and follow income changes", () => {
    const data = sample();
    const limits = jarSummaries(data, "2026-11").map((j) => j.limit);
    expect(limits).toEqual([27500, 5000, 5000, 5000, 5000, 2500]);

    data.settings.income = 50000;
    expect(jarSummaries(data, "2026-11")[0]?.limit).toBe(27500);
  });
});

describe("spent and left", () => {
  it("only counts spends in the given month and jar", () => {
    const data = withSpends([
      { amount: 15, jar: "play", note: "tea", date: "2026-11-17" },
      { amount: 600, jar: "play", note: "trip", date: "2026-11-02" },
      { amount: 999, jar: "play", note: "old", date: "2026-10-30" },
    ]);
    const play = jarSummaries(data, "2026-11").find((j) => j.id === "play");
    expect(play).toMatchObject({ spent: 615, left: 5000 - 615 });
  });
});

describe("overall remaining", () => {
  it("subtracts jar spends and outside-jar spends from income", () => {
    const data = withSpends([
      { amount: 20000, jar: "necessities", note: "rent", date: "2026-11-01" },
      { amount: 600, jar: "outside", note: "3rd trip", date: "2026-11-20" },
    ]);
    expect(overallRemaining(data, "2026-11")).toBe(50000 - 20000 - 600);
    // Outside spends never touch a jar's limit.
    expect(jarSummaries(data, "2026-11").every((j) => j.id === "necessities" || j.spent === 0)).toBe(true);
  });
});

describe("friend balances", () => {
  it("is gave minus got per person", () => {
    const balances = friendBalances([
      { id: id(), person: "A", amount: 5000, type: "got", note: "", date: "2026-11-01" },
      { id: id(), person: "A", amount: 2500, type: "gave", note: "", date: "2026-12-01" },
      { id: id(), person: "B", amount: 6000, type: "gave", note: "", date: "2026-11-01" },
    ]);
    expect(balances).toEqual([
      { person: "A", balance: -2500 },
      { person: "B", balance: 6000 },
    ]);
  });
});

describe("fixed spends", () => {
  it("are added once per month with the salary, dated the 1st", () => {
    const once = addFixedSpends(sample(), "2026-11", id);
    const twice = addFixedSpends(once, "2026-11", id);
    expect(twice.spends).toHaveLength(sample().settings.fixed.length);
    expect(twice.spends.every((s) => s.date === "2026-11-01")).toBe(true);
    expect(twice.incomes).toEqual([expect.objectContaining({ amount: 50000, note: "Salary", date: "2026-11-01" })]);
    expect(addFixedSpends(twice, "2026-12", id).spends).toHaveLength(2 * twice.spends.length);
  });
});

describe("balance", () => {
  it("is null until I enter it, then follows every entry from that day on", () => {
    const start = withSpends([{ amount: 100, jar: "play", note: "earlier today", date: "2026-11-17" }]);
    expect(balance(start)).toBeNull();

    // "I have 12,000 right now": today's earlier spend must not be counted twice.
    let data = setBalance(start, 12000, "2026-11-17");
    expect(balance(data)).toBe(12000);

    data = { ...data, spends: [...data.spends, { id: id(), amount: 15, jar: "play", note: "tea", date: "2026-11-18" }] };
    data = { ...data, friends: [{ id: id(), person: "A", amount: 2500, type: "gave", note: "", date: "2026-11-19" }] };
    data = { ...data, incomes: [{ id: id(), amount: 50000, note: "Salary", date: "2026-11-30" }] };
    expect(balance(data)).toBe(12000 - 15 - 2500 + 50000);
  });
});

describe("reconcile", () => {
  it("turns a first-time gap into one Untracked spend and sets the balance", () => {
    // Month starts at 0 + 50,000 salary. 20,000 tracked. I really have 12,000. So 18,000 is untracked.
    const data = withSpends([{ amount: 20000, jar: "necessities", note: "rent+", date: "2026-11-01" }]);
    const fixed = reconcile(data, 12000, "2026-11-17", id);
    expect(fixed.spends.at(-1)).toMatchObject({ amount: 18000, jar: "untracked", date: "2026-11-17" });
    expect(balance(fixed)).toBe(12000);
    expect(jarSummaries(fixed, "2026-11").every((j) => j.id === "necessities" || j.spent === 0)).toBe(true);
  });

  it("adds extra money as Money in when I have more than expected", () => {
    const data = setBalance(sample(), 5000, "2026-11-10");
    const fixed = reconcile(data, 5600, "2026-11-17", id);
    expect(fixed.incomes.at(-1)).toMatchObject({ amount: 600 });
    expect(balance(fixed)).toBe(5600);
  });
});

describe("history", () => {
  it("merges spends, money in and friend money, newest first, with signed amounts", () => {
    const data: Data = {
      ...withSpends([{ amount: 15, jar: "play", note: "tea", date: "2026-11-17" }]),
      incomes: [{ id: id(), amount: 50000, note: "Salary", date: "2026-11-01" }],
      friends: [{ id: id(), person: "A", amount: 6000, type: "got", note: "", date: "2026-11-10" }],
    };
    expect(history(data, "2026-11").map((h) => [h.kind, h.amount])).toEqual([
      ["spend", -15],
      ["friend", 6000],
      ["income", 50000],
    ]);
    expect(history(data, "2026-10")).toEqual([]);
  });
});

describe("recent notes", () => {
  it("lists different notes newest first, ignoring case", () => {
    const data = withSpends([
      { amount: 15, jar: "play", note: "tea", date: "2026-11-10" },
      { amount: 45, jar: "necessities", note: "cab", date: "2026-11-11" },
      { amount: 20, jar: "play", note: "Tea", date: "2026-11-12" },
    ]);
    expect(recentNotes(data.spends)).toEqual([
      { note: "Tea", jar: "play", amount: 20 },
      { note: "cab", jar: "necessities", amount: 45 },
    ]);
  });
});

describe("addMonths", () => {
  it("crosses year boundaries", () => {
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2027-01", -1)).toBe("2026-12");
  });
});

describe("addFromUntracked", () => {
  // Setup: 18,000 untracked, balance 12,000 set on 17 Nov.
  const setup = () => reconcile(withSpends([{ amount: 20000, jar: "necessities", note: "rent+", date: "2026-11-01" }]), 12000, "2026-11-17", id);

  it("moves money out of Untracked into a jar without touching the balance", () => {
    for (const date of ["2026-11-05", "2026-11-17", "2026-11-20"]) {
      const next = addFromUntracked(setup(), { id: id(), amount: 1500.5, jar: "play", note: "movie", date });
      expect(jarSpent(next, "2026-11", "untracked")).toBe(16499.5);
      expect(jarSpent(next, "2026-11", "play")).toBe(1500.5);
      expect(balance(next)).toBe(12000);
      expect(overallRemaining(next, "2026-11")).toBe(overallRemaining(setup(), "2026-11"));
    }
  });

  it("only the part above what's left in Untracked lowers the balance", () => {
    const next = addFromUntracked(setup(), { id: id(), amount: 20000, jar: "play", note: "big", date: "2026-11-10" });
    expect(jarSpent(next, "2026-11", "untracked")).toBe(0);
    expect(next.spends.some((s) => s.jar === "untracked")).toBe(false);
    expect(balance(next)).toBe(10000);
  });
});

describe("paise", () => {
  it("keeps sums exact to 2 decimals", () => {
    const data = withSpends([
      { amount: 0.1, jar: "play", note: "a", date: "2026-11-02" },
      { amount: 0.2, jar: "play", note: "b", date: "2026-11-02" },
    ]);
    expect(jarSpent(data, "2026-11", "play")).toBe(0.3);
  });
});

describe("redoMonthCheck", () => {
  it("fixes a balance set before income: drops the wrong Extra money and finds the Untracked", () => {
    // Balance 8,000 was set while income was 0, so 28,000 "extra money" was added by mistake.
    const tracked = withSpends([{ amount: 20000, jar: "necessities", note: "rent", date: "2026-11-01" }]);
    const noIncome = { ...tracked, settings: { ...tracked.settings, income: 0 } };
    const wrong = reconcile(noIncome, 8000, "2026-11-17", id);
    expect(wrong.incomes.at(-1)).toMatchObject({ amount: 28000 });

    // Income is now 50,000. Redo: 50,000 − 20,000 tracked = 30,000 expected, I have 8,000.
    const fixed = redoMonthCheck({ ...wrong, settings: { ...wrong.settings, income: 50000 } }, 8000, "2026-11-18", id);
    expect(fixed.incomes).toEqual([]);
    expect(jarSpent(fixed, "2026-11", "untracked")).toBe(22000);
    expect(balance(fixed)).toBe(8000);
  });

  it("replaces an earlier Untracked entry instead of adding a second one", () => {
    const first = reconcile(withSpends([{ amount: 20000, jar: "necessities", note: "rent", date: "2026-11-01" }]), 12000, "2026-11-17", id);
    const again = redoMonthCheck(first, 10000, "2026-11-17", id);
    expect(again.spends.filter((s) => s.jar === "untracked")).toHaveLength(1);
    expect(jarSpent(again, "2026-11", "untracked")).toBe(20000);
  });
});
