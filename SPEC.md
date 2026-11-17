# Jars: spec (version 1)

A small phone app to track my money with the 6 jars system.
Built only for me. Fast to add a spend. Data stays on my phone.

## Problem

All my money sits in one account. Every spend feels small. At month end the
money is gone and I don't know where it went.

## Goal

- Add a spend in about 5 seconds.
- See, at any time, how much is left in each jar this month.
- Keep a clear record of money I gave to or got from friends.

## Not in version 1

Charts, bank statement import, reminders, login, cloud sync, many currencies,
plans for future trips. Add later only if I miss them.

## The jars

Income is set once in settings (example: 50,000). Each jar gets a share of income.

| Jar               | Share | Limit (at 50,000) |
| ----------------- | ----- | ----------------- |
| Necessities       | 55%   | 27,500            |
| Financial Freedom | 10%   | 5,000             |
| Long-term Savings | 10%   | 5,000             |
| Education         | 10%   | 5,000             |
| Play              | 10%   | 5,000             |
| Give              | 5%    | 2,500             |

Shares are editable in settings. They must add up to 100%.
 

There is also one special choice when adding a spend: **Outside jars**.
It is for planned extras that should not use a jar's limit (example: a 3rd
friends trip). It only lowers Overall Remaining.

## Screens

### 1. Home

- Month name at the top, with arrows to see past months.
- One card per jar: limit, spent, left. A bar shows how full it is.
  The bar turns red when spent is over the limit.
- **Overall Remaining** at the top:
  income - all spends this month (jars + outside jars).
- A big **+** button to add a spend.

### 2. Add spend (bottom sheet)

- Amount (number pad opens first).
- Jar (6 jar buttons + Outside jars). The last used jar is picked by default.
- Note (short text, optional). Example: "tea".
- Date (today by default, can change).
- Save. Then the sheet closes and Home updates.

Quick notes: show my last 5 different notes as chips, like "tea", "cab",
"food order". Tapping a chip fills the note and its last jar and amount.

### 3. Jar detail

Tap a jar card. Shows all spends in this jar for the month, newest first.
Tap a spend to edit or delete it.

### 4. Friends

- List of people with a balance each:
  - "You owe X 5,000" or "X owes you 6,000".
- Add entry: person, amount, type (**I gave** / **I got**), note, date.
- Tap a person to see their history.

Rules:
- I gave money = positive for me (they owe me, or I paid back what I owed).
- I got money = negative for me (I owe them, or they paid me back).
- Balance = sum of gave - sum of got.
- Friend entries do **not** count in jars. Lending is not spending.
  If I want it to count (example: paying back a friend from my buffer),
  I add a normal spend too.

### 5. Settings

- Monthly income.
- Jar shares.
- Fixed monthly spends: a list of (name, amount, jar), like rent, phone, subscriptions, SIP.
  Empty at first. The hosted code is public, so real numbers never go in it.
- **Download backup** (JSON file) and **Restore from backup**.

On the first open of a new month, Home shows a banner:
"Add this month's fixed spends?" One tap adds them all as spends.

## Data

Amounts are rupees with up to 2 decimals (paise), like 15.50. Sums are rounded to paise.

```ts
type JarId = "necessities" | "freedom" | "longterm" | "education" | "play" | "give" | "outside";

type Spend = {
  id: string;
  amount: number;   // rupees, > 0
  jar: JarId;
  note: string;
  date: string;     // "2026-11-17"
};

type FriendEntry = {
  id: string;
  person: string;
  amount: number;   // rupees, > 0
  type: "gave" | "got";
  note: string;
  date: string;
};

type FixedSpend = { name: string; amount: number; jar: JarId };

type Settings = {
  income: number;
  shares: Record<Exclude<JarId, "outside">, number>; // percents, sum = 100
  fixed: FixedSpend[];
};

type Data = {
  version: 1;
  settings: Settings;
  spends: Spend[];
  friends: FriendEntry[];
  fixedAddedFor: string[]; // months where fixed spends were added, "2026-11"
};
```

A month is a calendar month (1st to last day), based on `date`.

## Tech

- Vite + React + TypeScript (strict).
- PWA (installable, works offline) with `vite-plugin-pwa`.
- Storage: one JSON object in `localStorage`. Ask the browser to keep it with
  `navigator.storage.persist()`. Data is small, so this is enough.
- Mobile-first layout. Works with one thumb. Dark mode follows the phone.
- Hosting: a static site (example: Vercel or GitHub Pages) so the phone can
  install it over HTTPS. The server only serves files. No data goes there.

## Tests

Focused unit tests (Vitest) for the money logic only:
- Jar limits from income and shares.
- Spent and left per jar for a month.
- Overall Remaining, with Outside jars spends.
- Friend balances.
- Adding fixed spends only once per month.

## Done when

- I can install it on my phone and add "15, Play, tea" in about 5 seconds.
- Home shows correct limits, spent, and left for all jars.
- Friend balances are right.
- Backup and restore work.

## Added after version 1

### Money left (real balance)

- Home shows **Money left now**: spendable money (bank + UPI + cash, not SIP or
  emergency fund). It carries over across months.
- First time: "Set balance". I type what I have now. The app expects
  salary − everything tracked this month (+/− friend money). The gap becomes one
  ❓ **Untracked** spend ("Not sure where it went"). I can edit it later and move
  it to the right jar. Or I can skip the gap and just set the balance.
- Later: tap **Edit** (or the big number). Two choices:
  - **Fix the number**: the current balance is filled in. Change it, nothing else is added.
  - **Compare with bank**: type what the bank shows. The gap becomes Untracked (or Money in).
- Balance = balance I entered + money in − spends + friend "got" − friend "gave",
  for every entry dated on or after the day I entered it.
- "This month's plan" (income − spends this month) stays under it.

### Money in

The add sheet has a Spend / Money in switch. Money in is salary, refunds, etc.
The fixed spends banner on the 1st also adds the salary as Money in.

### Untracked jar

Like Outside jars: not part of any limit, only lowers the month's plan.

While a month has Untracked money, the add sheet shows a small chip under the
note: **Old spend? Take from Untracked**. It's off by default, so a spend lowers
my balance. Tapped on, it means a past spend I just remembered: the amount moves
out of Untracked into the jar I pick, and my balance stays the same. If it's
bigger than what's left in Untracked, only the extra lowers the balance. This is
mostly for the first month, so it stays small.

Untracked is not in the jar list. It is only made by the balance check.

### History tab

All entries of a month in one list, like a UPI app: spends, money in, friend
money. Grouped by day with a day total. Money in / Money out totals on top.
Tap a spend or money in to edit it.

## Look and feel

- Mobile first: works from 320px phones up. Text and big numbers scale with the screen.
- Safe areas for notches and the home bar. Inputs are 16px+ so iOS never zooms.
- Jars show as 2-column tiles with a ring per jar (1 column on very small phones).
- A small top bar with the page title shows once the big title scrolls away.
- Sheets: swipe down or flick to close. Saved entries open read-only first.
- Motion stays under 300ms for UI (sheets ~380ms). Exits are faster than enters.
  With "reduce motion" on, only gentle fades stay.
- A short buzz on save (Android).

## Hosting

GitHub Pages, deployed by GitHub Actions on every push to `main`
(`.github/workflows/deploy.yml`). The app is served under `/jars/`.
