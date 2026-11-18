import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cleanAmountInput, parseAmount, rupees } from "./format";
import { ALL_JARS, BUDGET_JARS, jarLimit, sharesTotal } from "./money";
import { downloadBackup, parseData } from "./store";
import { loadTheme, saveTheme, type Theme } from "./theme";
import type { Data, JarId, Settings as SettingsT } from "./types";
import { Icons, JAR_LOOK, JarIcon, stagger } from "./ui";

type Props = {
  data: Data;
  onSettings: (s: SettingsT) => void;
  onName: (name: string) => void;
  // Shows the first-run setup again (data is kept).
  onRunSetup: () => void;
  onRestore: (d: Data) => void;
};

const THEMES: { id: Theme; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

/** Typed percent -> whole number, or 0 when empty or invalid. */
const num = (v: string) => Math.max(0, Math.round(Number(v) || 0));

/** Amount box that lets you type "15." on the way to "15.5". Reports 0 while empty. */
export function MoneyInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const [text, setText] = useState(value ? String(value) : "");
  // Follow outside changes (like a restored backup) without fighting the user's typing.
  useEffect(() => {
    setText((t) => ((parseAmount(t) ?? 0) === value ? t : value ? String(value) : ""));
  }, [value]);
  return (
    <input
      inputMode="decimal"
      aria-label={label}
      placeholder="0"
      value={text}
      onChange={(e) => {
        const t = cleanAmountInput(e.target.value);
        setText(t);
        onChange(parseAmount(t) ?? 0);
      }}
    />
  );
}

/** Income, jar shares, fixed monthly spends, and backup. Changes save right away. */
export function Settings({ data, onSettings, onName, onRunSetup, onRestore }: Props) {
  const s = data.settings;
  const total = sharesTotal(s);
  const fileRef = useRef<HTMLInputElement>(null);
  const [theme, setTheme] = useState(loadTheme);

  return (
    <>
      <header className="page-head">
        <h1 className="title">Settings</h1>
      </header>

      <section className="card stack enter" style={stagger(0)}>
        <label className="field">
          <span className="field-label">Your name</span>
          <input value={data.name ?? ""} placeholder="Name (optional)" onChange={(e) => onName(e.target.value)} />
        </label>
        <label className="field">
          <span className="field-label">Monthly income</span>
          <span className="amount-wrap small">
            <span className="amount-prefix">₹</span>
            <MoneyInput label="Monthly income" value={s.income} onChange={(income) => onSettings({ ...s, income })} />
          </span>
        </label>
      </section>

      <h2 className="section-title">Jar shares</h2>
      <section className="card stack enter" style={stagger(1)}>
        <p className="muted small-text">Limits update by themselves when income changes.</p>
        {BUDGET_JARS.map((j) => (
          <div className="share-row" key={j.id} style={{ "--c": JAR_LOOK[j.id].color } as CSSProperties}>
            <JarIcon jar={j.id} size={36} />
            <span className="share-name">
              {j.name}
              <span className="muted small-text">{rupees(jarLimit(s, j.id))}</span>
            </span>
            <span className="share-input">
              <input
                inputMode="numeric"
                aria-label={`${j.name} percent`}
                value={s.shares[j.id] || ""}
                placeholder="0"
                onChange={(e) => onSettings({ ...s, shares: { ...s.shares, [j.id]: num(e.target.value) } })}
              />
              <span className="muted">%</span>
            </span>
          </div>
        ))}
        <p className={total === 100 ? "total-ok small-text" : "neg small-text"}>
          Total {total}%{total !== 100 && " · must be 100%"}
        </p>
      </section>

      <h2 className="section-title">Fixed monthly spends</h2>
      <section className="card stack enter" style={stagger(2)}>
        <p className="muted small-text">Added on the 1st, together with your salary, when you tap "Add" on the Jars page.</p>
        {s.fixed.map((f, i) => {
          const update = (patch: Partial<typeof f>) => onSettings({ ...s, fixed: s.fixed.map((x, k) => (k === i ? { ...x, ...patch } : x)) });
          return (
            <div className="fixed-row" key={i}>
              <input className="fixed-name" aria-label="Name" placeholder="Name" value={f.name} onChange={(e) => update({ name: e.target.value })} />
              <button className="icon-btn" aria-label={`Remove ${f.name || "fixed spend"}`} onClick={() => onSettings({ ...s, fixed: s.fixed.filter((_, k) => k !== i) })}>
                {Icons.close}
              </button>
              <span className="amount-wrap small">
                <span className="amount-prefix">₹</span>
                <MoneyInput label="Amount" value={f.amount} onChange={(amount) => update({ amount })} />
              </span>
              <select aria-label="Jar" value={f.jar} onChange={(e) => update({ jar: e.target.value as JarId })}>
                {ALL_JARS.map((j) => (
                  <option key={j.id} value={j.id}>
                    {JAR_LOOK[j.id].icon} {j.name}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
        <button className="secondary" onClick={() => onSettings({ ...s, fixed: [...s.fixed, { name: "", amount: 0, jar: "necessities" }] })}>
          + Add fixed spend
        </button>
      </section>

      <h2 className="section-title">Theme</h2>
      <section className="card enter" style={stagger(3)}>
        <div className="segmented" role="radiogroup" aria-label="Theme" style={{ "--n": THEMES.length, "--i": THEMES.findIndex((t) => t.id === theme) } as CSSProperties}>
          <span className="seg-thumb" aria-hidden />
          {THEMES.map((t) => (
            <button
              type="button"
              key={t.id}
              role="radio"
              aria-checked={theme === t.id}
              className={theme === t.id ? "seg on" : "seg"}
              onClick={() => {
                setTheme(t.id);
                saveTheme(t.id);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <h2 className="section-title">Backup</h2>
      <section className="card stack enter" style={stagger(4)}>
        <p className="muted small-text">Your data lives only on this phone. Download a backup every week.</p>
        <button className="secondary" onClick={() => downloadBackup(data)}>
          Download backup
        </button>
        <button className="secondary" onClick={() => fileRef.current?.click()}>
          Restore from backup
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          hidden
          onChange={async (e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            const restored = parseData(await file.text());
            if (!restored) return alert("This file is not a Jars backup.");
            if (confirm("Replace all current data with this backup?")) onRestore(restored);
          }}
        />
      </section>
      <section className="card stack enter setup-again" style={stagger(5)}>
        <button className="secondary" onClick={onRunSetup}>
          Run setup again
        </button>
      </section>
    </>
  );
}
