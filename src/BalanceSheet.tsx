import { useState } from "react";
import { cleanAmountInput, parseAmount, rupees } from "./format";
import { balance, expectedBalance, withoutMonthCheck } from "./money";
import { Sheet } from "./Sheet";
import { today } from "./store";
import type { Data } from "./types";

type Props = {
  data: Data;
  // how: "set" = just set the number. "compare" = the gap becomes Untracked (or Money in).
  // "redo" = start this month's check over (salary − tracked), replacing earlier auto entries.
  onSave: (actual: number, how: "set" | "compare" | "redo") => void;
  onClose: () => void;
};

type Mode = "fix" | "compare";

/**
 * Two jobs:
 * - Fix: correct the number (a typo). Starts with the current balance filled in. Nothing else is added.
 * - Compare: type what the bank shows. The gap becomes one Untracked spend (or Money in).
 * The first time there is no balance yet, so only Compare makes sense.
 */
export function BalanceSheet({ data, onSave, onClose }: Props) {
  const current = balance(data);
  const firstTime = current === null;
  const [mode, setMode] = useState<Mode>(firstTime ? "compare" : "fix");
  const [amount, setAmount] = useState(mode === "fix" && current !== null ? String(current) : "");
  const [redo, setRedo] = useState(false);

  const actual = /^0+(\.0*)?$/.test(amount) ? 0 : parseAmount(amount);
  const expected = redo ? expectedBalance(withoutMonthCheck(data, today()), today()) : expectedBalance(data, today());
  const gap = actual === null ? 0 : Math.round((expected - actual) * 100) / 100;

  function switchMode(m: Mode) {
    setMode(m);
    setAmount(m === "fix" && current !== null ? String(current) : "");
  }

  return (
    <Sheet title={firstTime ? "Set your balance" : "Balance"} onClose={onClose}>
      {(close) => (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (actual === null) return;
            onSave(actual, mode === "fix" ? "set" : redo ? "redo" : "compare");
            close();
          }}
        >
          {!firstTime && (
            <div className="segmented" role="radiogroup" aria-label="What do you want to do?">
              <span className={mode === "fix" ? "seg-thumb" : "seg-thumb right"} aria-hidden />
              <button type="button" role="radio" aria-checked={mode === "fix"} className={mode === "fix" ? "seg on" : "seg"} onClick={() => switchMode("fix")}>
                Fix the number
              </button>
              <button type="button" role="radio" aria-checked={mode === "compare"} className={mode === "compare" ? "seg on" : "seg"} onClick={() => switchMode("compare")}>
                Compare with bank
              </button>
            </div>
          )}

          <p className="hint-text">
            {mode === "fix"
              ? "Typed it wrong? Change the number. Nothing else gets added."
              : "Type the money you can spend right now: bank + UPI + cash. Leave out SIP and emergency fund."}
          </p>

          <label className="amount-wrap">
            <span className="amount-prefix">₹</span>
            <input
              key={mode}
              className="amount-input"
              inputMode="decimal"
              placeholder="0"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(cleanAmountInput(e.target.value))}
              onFocus={(e) => mode === "fix" && e.target.select()}
              aria-label="Money you have now"
            />
          </label>

          {mode === "compare" && (
            <>
              {!firstTime && (
                <div className="from-untracked">
                  <button type="button" role="switch" aria-checked={redo} className={redo ? "mini-chip on" : "mini-chip"} onClick={() => setRedo(!redo)}>
                    {redo ? "✓ Start this month over" : "Start this month over"}
                  </button>
                  {redo && (
                    <span className="muted small-text">
                      Compares with salary − this month's spends, like the first time. Earlier auto entries (Untracked, Extra money) are replaced.
                    </span>
                  )}
                </div>
              )}
              <div className="card compare">
                <div className="compare-row">
                  <span className="muted">{firstTime || redo ? "Expected (salary − tracked this month)" : "App expected"}</span>
                  <b>{rupees(expected)}</b>
                </div>
                {actual !== null && (
                  <div className="compare-row">
                    <span className="muted">{gap > 0 ? "Untracked spend" : gap < 0 ? "Extra money" : "Difference"}</span>
                    <b className={gap > 0 ? "neg" : gap < 0 ? "pos" : ""}>{gap === 0 ? "None 🎉" : rupees(Math.abs(gap))}</b>
                  </div>
                )}
              </div>
              {actual !== null && gap > 0 && (
                <p className="hint-text">
                  {rupees(gap)} becomes one ❓ Untracked spend. When you remember something, add it with "Old spend? Take from Untracked".
                </p>
              )}
            </>
          )}

          <button className="primary" type="submit" disabled={actual === null}>
            {mode === "fix" ? "Save balance" : gap === 0 ? "Save balance" : gap > 0 ? `Save + add ${rupees(gap)} untracked` : `Save + add ${rupees(-gap)} money in`}
          </button>
          {mode === "compare" && actual !== null && gap !== 0 && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                onSave(actual, "set");
                close();
              }}
            >
              Just set balance, skip the difference
            </button>
          )}
        </form>
      )}
    </Sheet>
  );
}
