import { useState, type CSSProperties } from "react";
import { cleanAmountInput, parseAmount, rupees } from "./format";
import { ALL_JARS, BUDGET_JARS, jarLimit, setBalance, sharesTotal } from "./money";
import { MoneyInput } from "./Settings";
import { newId, today } from "./store";
import type { Data, FixedSpend, JarId, Settings } from "./types";
import { Icons, JAR_LOOK, JarIcon } from "./ui";

type Props = {
  data: Data;
  onDone: (data: Data) => void;
};

const STEPS = 5;

/**
 * First-run setup, one question per screen, in the order the numbers depend on each other:
 * name, income, jar split, fixed spends, then money right now (so Untracked comes out right).
 */
export function Onboarding({ data, onDone }: Props) {
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState<"fwd" | "back">("fwd");
  const [name, setName] = useState(data.name ?? "");
  const [settings, setSettings] = useState<Settings>(data.settings);
  const [money, setMoney] = useState("");

  const total = sharesTotal(settings);
  const moneyValue = /^0+(\.0*)?$/.test(money) ? 0 : parseAmount(money);

  const go = (n: number) => {
    setDir(n > step ? "fwd" : "back");
    setStep(n);
  };

  function finish(withBalance: boolean) {
    let next: Data = { ...data, name: name.trim() || undefined, settings, onboarded: true };
    if (withBalance && moneyValue !== null) next = setBalance(next, moneyValue, today(), newId);
    onDone(next);
  }

  const updateFixed = (i: number, patch: Partial<FixedSpend>) => setSettings({ ...settings, fixed: settings.fixed.map((f, k) => (k === i ? { ...f, ...patch } : f)) });

  return (
    <div className="onboard">
      <header className="onboard-top">
        {step > 0 ? (
          <button className="icon-btn" onClick={() => go(step - 1)} aria-label="Back">
            {Icons.back}
          </button>
        ) : (
          <span className="onboard-spacer" />
        )}
        <div className="dots" aria-label={`Step ${step + 1} of ${STEPS}`}>
          {Array.from({ length: STEPS }, (_, i) => (
            <span key={i} className={i === step ? "dot on" : i < step ? "dot done" : "dot"} />
          ))}
        </div>
        <span className="onboard-spacer" />
      </header>

      <form
        key={step}
        className={`onboard-body page ${dir}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (step === 1 && settings.income <= 0) return;
          if (step === 2 && total !== 100) return;
          if (step < STEPS - 1) go(step + 1);
          else if (moneyValue !== null) finish(true);
        }}
      >
        {step === 0 && (
          <>
            <p className="onboard-emoji" aria-hidden>
              🫙
            </p>
            <h1 className="title">Let's set up your jars</h1>
            <p className="hint-text">Every rupee goes into a jar: needs, investing, savings, learning, fun, giving. Takes about a minute.</p>
            <label className="field">
              <span className="field-label">Your name (optional)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" autoComplete="given-name" autoFocus />
            </label>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="title">What's your monthly income?</h1>
            <p className="hint-text">Your take-home salary. Jar limits come from it, and they update by themselves if it changes.</p>
            <span className="amount-wrap small onboard-money">
              <span className="amount-prefix">₹</span>
              <MoneyInput label="Monthly income" value={settings.income} onChange={(income) => setSettings({ ...settings, income })} />
            </span>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="title">How should it be split?</h1>
            <p className="hint-text">This is the usual 6 jars split. Change any percent, or keep it.</p>
            <div className="card stack">
              {BUDGET_JARS.map((j) => (
                <div className="share-row" key={j.id} style={{ "--c": JAR_LOOK[j.id].color } as CSSProperties}>
                  <JarIcon jar={j.id} size={36} />
                  <span className="share-name">
                    {j.name}
                    <span className="muted small-text">{rupees(jarLimit(settings, j.id))}</span>
                  </span>
                  <span className="share-input">
                    <input
                      inputMode="numeric"
                      aria-label={`${j.name} percent`}
                      value={settings.shares[j.id] || ""}
                      placeholder="0"
                      onChange={(e) => setSettings({ ...settings, shares: { ...settings.shares, [j.id]: Math.max(0, Math.round(Number(e.target.value) || 0)) } })}
                    />
                    <span className="muted">%</span>
                  </span>
                </div>
              ))}
              <p className={total === 100 ? "total-ok small-text" : "neg small-text"}>
                Total {total}%{total !== 100 && " · must be 100%"}
              </p>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="title">Any fixed monthly spends?</h1>
            <p className="hint-text">Rent, phone, subscriptions, SIP. On the 1st of each month you can add them all with one tap.</p>
            {settings.fixed.length > 0 && (
              <div className="card stack">
                {settings.fixed.map((f, i) => (
                  <div className="fixed-row" key={i}>
                    <input className="fixed-name" aria-label="Name" placeholder="Name" value={f.name} onChange={(e) => updateFixed(i, { name: e.target.value })} />
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Remove ${f.name || "fixed spend"}`}
                      onClick={() => setSettings({ ...settings, fixed: settings.fixed.filter((_, k) => k !== i) })}
                    >
                      {Icons.close}
                    </button>
                    <span className="amount-wrap small">
                      <span className="amount-prefix">₹</span>
                      <MoneyInput label="Amount" value={f.amount} onChange={(amount) => updateFixed(i, { amount })} />
                    </span>
                    <select aria-label="Jar" value={f.jar} onChange={(e) => updateFixed(i, { jar: e.target.value as JarId })}>
                      {ALL_JARS.filter((j) => j.id !== "untracked").map((j) => (
                        <option key={j.id} value={j.id}>
                          {JAR_LOOK[j.id].icon} {j.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
            <button type="button" className="secondary" onClick={() => setSettings({ ...settings, fixed: [...settings.fixed, { name: "", amount: 0, jar: "necessities" }] })}>
              + Add a fixed spend
            </button>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="title">How much can you spend right now?</h1>
            <p className="hint-text">
              Bank + UPI + cash today. Leave out SIP and emergency fund. If some of this month's money went somewhere you don't remember, the app shows it as
              ❓ Untracked.
            </p>
            <label className="amount-wrap">
              <span className="amount-prefix">₹</span>
              <input
                className="amount-input"
                inputMode="decimal"
                placeholder="0"
                autoFocus
                value={money}
                onChange={(e) => setMoney(cleanAmountInput(e.target.value))}
                aria-label="Money you have now"
              />
            </label>
          </>
        )}

        <div className="onboard-actions">
          {step === 4 ? (
            <>
              <button className="primary" type="submit" disabled={moneyValue === null}>
                Finish
              </button>
              <button type="button" className="secondary" onClick={() => finish(false)}>
                Skip for now
              </button>
            </>
          ) : (
            <button className="primary" type="submit" disabled={(step === 1 && settings.income <= 0) || (step === 2 && total !== 100)}>
              {step === 0 ? "Start" : step === 2 ? "Looks good" : step === 3 && settings.fixed.length === 0 ? "Skip" : "Next"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
