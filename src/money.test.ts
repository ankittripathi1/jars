import { describe, expect, it } from "vitest";
import {
  addFixedSpends,
  addMonths,
  balance,
  EXTRA_NOTE,
  friendBalances,
  groupByDay,
  history,
  jarSpent,
  jarSummaries,
  migrateOldChecks,
  overallRemaining,
  recentNotes,
  setBalance,
  untracked,
  UNTRACKED_NOTE,
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

const addSpend = (d: Data, s: Omit<Spend, "id">): Data => ({ ...d, spends: [...d.spends, { ...s, id: id() }] });

describe("jar limits", () => {
  it("come from income and shares, and follow income changes", () => {
    const data = sample();
    expect(jarSummaries(data, "2026-11").map((j) => j.limit)).toEqual([27500, 5000, 5000, 5000, 5000, 2500]);
    data.settings.income = 60000;
    expect(jarSummaries(data, "2026-11")[0]?.limit).toBe(33000);
  });
});

describe("spent and left", () => {
  it("only counts spends in the given month and jar", () => {
    const data = withSpends([
      { amount: 15, jar: "play", note: "tea", date: "2026-11-17" },
      { amount: 600, jar: "play", note: "trip", date: "2026-11-02" },
      { amount: 999, jar: "play", note: "old", date: "2026-10-30" },
    ]);
    expect(jarSummaries(data, "2026-11").find((j) => j.id === "play")).toMatchObject({ spent: 615, left: 5000 - 615 });
  });
});

describe("balance and live Untracked", () => {
  // November: 20,000 tracked so far. On the 17th I really have 8,000.
  // Expected 50,000 − 20,000 = 30,000, so 22,000 is untracked.
  const checked = () => setBalance(withSpends([{ amount: 20000, jar: "necessities", note: "rent", date: "2026-11-01" }]), 8000, "2026-11-17", id);

  it("is null until I enter a balance", () => {
    expect(balance(sample())).toBeNull();
    expect(untracked(sample(), "2026-11")).toBe(0);
  });

  it("finds the gap and the month's plan matches my real money", () => {
    const d = checked();
    expect(balance(d)).toBe(8000);
    expect(untracked(d, "2026-11")).toBe(22000);
    expect(overallRemaining(d, "2026-11")).toBe(8000);
    expect(untracked(d, "2026-12")).toBe(0);
  });

  it("does not depend on order: setting the income after the balance still works", () => {
    const noIncome = withSpends([{ amount: 20000, jar: "necessities", note: "rent", date: "2026-11-01" }]);
    noIncome.settings.income = 0;
    const d = setBalance(noIncome, 8000, "2026-11-17", id);
    expect(untracked(d, "2026-11")).toBe(0);
    d.settings.income = 50000;
    expect(untracked(d, "2026-11")).toBe(22000);
    expect(balance(d)).toBe(8000);
  });

  it("a new spend lowers the balance, Untracked stays", () => {
    const d = addSpend(checked(), { amount: 15, jar: "play", note: "tea", date: "2026-11-17" });
    expect(balance(d)).toBe(7985);
    expect(untracked(d, "2026-11")).toBe(22000);
  });

  it("an old spend marked Untracked money shrinks Untracked, balance stays (any date, even the same day)", () => {
    for (const date of ["2026-11-05", "2026-11-17", "2026-11-20"]) {
      const d = addSpend(checked(), { amount: 1500.5, jar: "play", note: "movie", date, fromUntracked: true });
      expect(balance(d)).toBe(8000);
      expect(untracked(d, "2026-11")).toBe(20499.5);
      expect(jarSpent(d, "2026-11", "play")).toBe(1500.5);
    }
  });

  it("deleting a marked spend puts the money back in Untracked", () => {
    const d = addSpend(checked(), { amount: 1000, jar: "play", note: "movie", date: "2026-11-05", fromUntracked: true });
    expect(untracked({ ...d, spends: d.spends.filter((s) => !s.fromUntracked) }, "2026-11")).toBe(22000);
  });

  it("friend money moves the balance", () => {
    const d = { ...checked(), friends: [{ id: id(), person: "A", amount: 2500, type: "gave" as const, note: "", date: "2026-11-19" }] };
    expect(balance(d)).toBe(5500);
    expect(untracked(d, "2026-11")).toBe(22000);
  });

  it("fixing the number in the same month only changes Untracked", () => {
    const d = setBalance(checked(), 9000, "2026-11-18", id);
    expect(balance(d)).toBe(9000);
    expect(untracked(d, "2026-11")).toBe(21000);
  });

  it("a check in a new month keeps the old month's Untracked and starts from the old balance", () => {
    let d = checked();
    d = { ...d, incomes: [{ id: id(), amount: 50000, note: "Salary", date: "2026-12-01" }] };
    d = addSpend(d, { amount: 1000, jar: "play", note: "dinner", date: "2026-12-05" });
    // Expected on 10 Dec: 8,000 + 50,000 − 1,000 = 57,000. I have 56,500, so 500 untracked in December.
    d = setBalance(d, 56500, "2026-12-10", id);
    expect(balance(d)).toBe(56500);
    expect(jarSpent(d, "2026-11", "untracked")).toBe(22000);
    expect(untracked(d, "2026-11")).toBe(0);
    expect(untracked(d, "2026-12")).toBe(500);
  });
});

describe("migrateOldChecks", () => {
  it("removes saved gap entries from older versions and keeps the real balance", () => {
    // What older versions saved: a balance check with an "Extra money found" income (balance set before income).
    const old: Data = {
      ...withSpends([{ amount: 20000, jar: "necessities", note: "rent", date: "2026-11-01" }]),
      incomes: [{ id: id(), amount: 28000, note: EXTRA_NOTE, date: "2026-11-17" }],
      balanceStart: { date: "2026-11-17", amount: 8000 - 28000, opening: 0 },
    };
    expect(balance(old)).toBe(8000);
    const d = migrateOldChecks(old);
    expect(d.incomes).toEqual([]);
    expect(balance(d)).toBe(8000);
    expect(untracked(d, "2026-11")).toBe(22000);
  });

  it("also removes an old Untracked spend, so it isn't counted twice", () => {
    const old: Data = {
      ...withSpends([
        { amount: 20000, jar: "necessities", note: "rent", date: "2026-11-01" },
        { amount: 22000, jar: "untracked", note: UNTRACKED_NOTE, date: "2026-11-17" },
      ]),
      balanceStart: { date: "2026-11-17", amount: 8000 + 22000, opening: 0 },
    };
    const d = migrateOldChecks(old);
    expect(d.spends.some((s) => s.jar === "untracked")).toBe(false);
    expect(balance(d)).toBe(8000);
    expect(untracked(d, "2026-11")).toBe(22000);
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

describe("paise", () => {
  it("keeps sums exact to 2 decimals", () => {
    const data = withSpends([
      { amount: 0.1, jar: "play", note: "a", date: "2026-11-02" },
      { amount: 0.2, jar: "play", note: "b", date: "2026-11-02" },
    ]);
    expect(jarSpent(data, "2026-11", "play")).toBe(0.3);
  });
});

describe("groupByDay", () => {
  it("makes one group per day and keeps the order", () => {
    const rows = [{ date: "2026-11-03", n: 1 }, { date: "2026-11-03", n: 2 }, { date: "2026-11-01", n: 3 }];
    expect(groupByDay(rows)).toEqual([
      { day: "2026-11-03", items: [rows[0], rows[1]] },
      { day: "2026-11-01", items: [rows[2]] },
    ]);
  });
});
