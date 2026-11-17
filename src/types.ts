// Amounts are rupees with up to 2 decimals (paise). Sums are rounded with round2. Dates are local "YYYY-MM-DD" strings.

export type BudgetJarId = "necessities" | "freedom" | "longterm" | "education" | "play" | "give";
// "outside" = planned extra that skips jar limits. "untracked" = money gone, reason unknown.
export type ExtraJarId = "outside" | "untracked";
export type JarId = BudgetJarId | ExtraJarId;

export type Spend = {
  id: string;
  amount: number;
  jar: JarId;
  note: string;
  date: string;
};

/** Money in: salary, refunds, anything that adds to my balance (not friend money). */
export type Income = {
  id: string;
  amount: number;
  note: string;
  date: string;
};

export type FriendEntry = {
  id: string;
  person: string;
  amount: number;
  type: "gave" | "got";
  note: string;
  date: string;
};

export type FixedSpend = { name: string; amount: number; jar: JarId };

export type Settings = {
  income: number;
  // Percents per jar. Must add up to 100. Limits are always derived from these.
  shares: Record<BudgetJarId, number>;
  fixed: FixedSpend[];
};

export type Data = {
  version: 1;
  settings: Settings;
  spends: Spend[];
  incomes: Income[];
  friends: FriendEntry[];
  // Months ("YYYY-MM") where fixed spends and salary were already added.
  fixedAddedFor: string[];
  // Spendable money at the start of `date`. Every entry dated on or after it moves the balance.
  // Missing until I first enter my real balance.
  balanceStart?: { date: string; amount: number };
};
