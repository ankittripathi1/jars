import { useState } from "react";
import { cleanAmountInput, parseAmount, rupees } from "./format";
import { balance, expectedBalance } from "./money";
import { Sheet } from "./Sheet";
import { today } from "./store";
import type { Data } from "./types";

type Props = {
  data: Data;
  // fillGap: true = turn the difference into an Untracked entry. false = just set the balance.
  onSave: (actual: number, fillGap: boolean) => void;
  onClose: () => void;
};

/**
 * "How much do you really have?" Compares it with what the app expects and shows the gap.
 * The first time, the app assumes the month started at zero plus salary.
 */
export function BalanceSheet({ data, onSave, onClose }: Props) {
  const [amount, setAmount] = useState("");
  const actual = amount.trim() === "0" ? 0 : parseAmount(amount);
  const firstTime = balance(data) === null;
  const expected = expectedBalance(data, today());
  const gap = actual === null ? 0 : expected - actual;

  return (
    <Sheet title={firstTime ? "Set your balance" : "Check balance"} onClose={onClose}>
      {(close) => (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (actual === null) return;
            onSave(actual, true);
            close();
          }}
        >
          <p className="muted small-text">
            Money you can spend right now: bank + UPI + cash. Don't count your SIP or emergency fund.
          </p>
          <label className="amount-wrap">
            <span className="amount-prefix">₹</span>
            <input className="amount-input" inputMode="decimal" placeholder="0" autoFocus value={amount} onChange={(e) => setAmount(cleanAmountInput(e.target.value))} aria-label="Money you have now" />
          </label>

          <div className="card compare">
            <div className="jar-top">
              <span className="muted">{firstTime ? "Expected (salary − tracked this month)" : "App expected"}</span>
              <b>{rupees(expected)}</b>
            </div>
            {actual !== null && (
              <div className="jar-top">
                <span className="muted">{gap > 0 ? "Untracked spend" : gap < 0 ? "Extra money" : "Difference"}</span>
                <b className={gap > 0 ? "neg" : gap < 0 ? "pos" : ""}>{gap === 0 ? "None 🎉" : rupees(Math.abs(gap))}</b>
              </div>
            )}
          </div>
          {actual !== null && gap > 0 && (
            <p className="muted small-text">
              {rupees(gap)} will be added as one ❓ Untracked spend. If you remember later, open it and move it to the right jar.
            </p>
          )}

          <button className="primary" type="submit" disabled={actual === null}>
            {gap === 0 ? "Save balance" : gap > 0 ? `Save + add ${rupees(gap)} untracked` : `Save + add ${rupees(-gap)} money in`}
          </button>
          {actual !== null && gap !== 0 && (
            <button
              type="button"
              className="secondary"
              onClick={() => {
                onSave(actual, false);
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
