# Jars

Phone app to track money with the 6 jars system. See [SPEC.md](SPEC.md).
All data stays in the phone's browser storage. Download a backup from Settings every week.

## Run

```sh
pnpm install
pnpm dev        # dev server, also on your Wi-Fi (open the "Network" URL on your phone)
pnpm test       # money logic tests
pnpm build      # type-check + production build in dist/
pnpm preview    # serve the production build
```

Install on the phone (offline mode, home screen icon) needs HTTPS, so deploy
`dist/` to a static host (Vercel or GitHub Pages). Over plain Wi-Fi HTTP the
app works, but it can't be installed.

## Files

- `src/money.ts`: all money math (limits, balance, live Untracked, friend balances). Tested in `money.test.ts`.
- `src/store.ts`: load/save to localStorage, default settings, backup.
- `src/App.tsx`: tabs and the add/edit spend sheet.
- `src/Home.tsx`, `src/Friends.tsx`, `src/Settings.tsx`: the screens.
- `src/Sheet.tsx`: bottom sheet (drag down to close, exit animation).
- `src/Onboarding.tsx`: first-run setup (name, income, split, fixed spends, money now).
- `src/BalanceSheet.tsx`: set or fix the real balance, with a live Untracked preview.
- `src/EntryView.tsx`: read-only view of a saved entry (Edit / Delete).
- `src/ui.tsx`: jar colors and icons, nav icons, count-up numbers.
- `src/styles.css`: theme ("Clean mint": white space, flat surfaces, green accent `#0E7C66`), spacing, motion.
