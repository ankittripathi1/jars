import { useState } from "react";
import { amountWidth, cleanAmountInput, parseAmount, rupees } from "./format";
import { balance, monthOf, setBalance, untracked } from "./money";
import { Sheet } from "./Sheet";
import { newId, today } from "./store";
import type { Data } from "./types";

type Props = {
  data: Data;
  onSave: (actual: number) => void;
  onClose: () => void;
};

/**
 * Set or correct my real balance. Untracked money is worked out live from it,
 * so there is nothing else to choose: fixing a typo and matching the bank are the same action.
 */
export function BalanceSheet({ data, onSave, onClose }: Props) {
  const current = balance(data);
  const [amount, setAmount] = useState(current !== null ? String(current) : "");
  const actual = /^0+(\.0*)?$/.test(amount) ? 0 : parseAmount(amount);
  const month = monthOf(today());
  // Preview what this month's Untracked would be with the typed amount.
  const preview = actual === null ? null : untracked(setBalance(data, actual, today(), newId), month);

  return (
    <Sheet title={current === null ? "Set your balance" : "Balance"} onClose={onClose}>
      {(close) => (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (actual === null) return;
            onSave(actual);
            close();
          }}
        >
          <p className="hint-text">Money you can spend right now: bank + UPI + cash. Leave out SIP and emergency fund.</p>

          <label className="amount-wrap">
            <span className="amount-prefix">₹</span>
            <input
              className="amount-input"
              inputMode="decimal"
              placeholder="0"
              autoFocus
              value={amount}
              style={amountWidth(amount)}
              onChange={(e) => setAmount(cleanAmountInput(e.target.value))}
              onFocus={(e) => e.target.select()}
              aria-label="Money you have now"
            />
          </label>

          {preview !== null && (
            <div className="card compare">
              <div className="compare-row">
                <span className="muted">Untracked this month</span>
                <b className={preview > 0 ? "neg" : ""}>{preview > 0 ? rupees(preview) : "None"}</b>
              </div>
              <p className="hint-text">
                {preview > 0
                  ? "Money that left but no entry explains it. When you remember a spend, mark it as Untracked money and this goes down."
                  : "Everything this month is explained."}
              </p>
            </div>
          )}

          <div className="sheet-foot">
            <button className="primary" type="submit" disabled={actual === null}>
              Save balance
            </button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
