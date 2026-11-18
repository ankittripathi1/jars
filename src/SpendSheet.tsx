import { useMemo, useState, type CSSProperties } from "react";
import { EntryView } from "./EntryView";
import { amountWidth, cleanAmountInput, fullDateLabel, parseAmount, rupees } from "./format";
import { ALL_JARS, jarName, monthOf, recentNotes } from "./money";
import { Sheet } from "./Sheet";
import { today } from "./store";
import type { Income, JarId, Spend } from "./types";
import { JAR_LOOK, JarIcon } from "./ui";

type Kind = "spend" | "income";

type Props = {
  spends: Spend[];
  // Present when editing. The kind can't change while editing.
  editing?: { kind: "spend"; item: Spend } | { kind: "income"; item: Income };
  defaultJar: JarId;
  // Untracked money left in a month ("YYYY-MM"), worked out live.
  untrackedLeft: (month: string) => number;
  // spend.fromUntracked = an old spend I just remembered: it explains Untracked money, not my balance.
  onSaveSpend: (spend: Omit<Spend, "id">) => void;
  onSaveIncome: (income: Omit<Income, "id">) => void;
  onDelete?: () => void;
  // Runs after the exit animation.
  onClose: () => void;
};

/**
 * Add a spend or Money in, or open a saved one.
 * A saved entry opens read-only first; the form only shows after tapping Edit.
 * When adding, the amount gets focus first so typing starts right away.
 */
export function SpendSheet({ spends, editing, defaultJar, untrackedLeft, onSaveSpend, onSaveIncome, onDelete, onClose }: Props) {
  const [kind, setKind] = useState<Kind>(editing?.kind ?? "spend");
  const [amount, setAmount] = useState(editing ? String(editing.item.amount) : "");
  const [jar, setJar] = useState<JarId>(editing?.kind === "spend" ? editing.item.jar : defaultJar === "untracked" ? "play" : defaultJar);
  const [note, setNote] = useState(editing?.item.note ?? "");
  const [date, setDate] = useState(editing?.item.date ?? today());

  // Marked as "Untracked money" (an old spend). Off unless I turn it on.
  const wasFlagged = editing?.kind === "spend" && editing.item.fromUntracked === true;
  const [flag, setFlag] = useState(wasFlagged);
  const [viewing, setViewing] = useState(editing !== undefined);

  // Worked out once when the sheet opens, not on every key press. The spends don't change while it's open.
  const [notes] = useState(() => (editing ? [] : recentNotes(spends)));
  const entryMonth = monthOf(date);
  // Keyed by month only: the data can't change while the sheet is open.
  const untrackedInMonth = useMemo(() => untrackedLeft(entryMonth), [entryMonth]);

  const parsed = parseAmount(amount);
  // How much Untracked money this spend can explain. When editing a marked spend, its own amount is free again.
  const room =
    untrackedInMonth + (wasFlagged && editing?.kind === "spend" && monthOf(editing.item.date) === monthOf(date) ? editing.item.amount : 0);
  const canUseUntracked = kind === "spend" && jar !== "untracked" && (room > 0 || wasFlagged);
  const fromUntracked = canUseUntracked && flag;
  const tooBig = fromUntracked && parsed !== null && parsed > room;
  // Untracked is not a real category. It only shows up when editing an Untracked entry itself.
  const jarChoices = ALL_JARS.filter((j) => j.id !== "untracked" || jar === "untracked");
  const chips = kind === "income" ? [] : notes;
  const title = editing ? (kind === "spend" ? "Edit spend" : "Edit money in") : "Add";

  if (editing && viewing) {
    const e = editing;
    return (
      <Sheet title={e.kind === "spend" ? "Spend" : "Money in"} onClose={onClose}>
        {(close) => (
          <EntryView
            icon={
              e.kind === "spend" ? (
                <JarIcon jar={e.item.jar} size={64} />
              ) : (
                <span className="jar-icon" style={{ "--c": "var(--pos)", width: 64, height: 64, fontSize: 30 } as CSSProperties} aria-hidden>
                  💰
                </span>
              )
            }
            amount={e.kind === "spend" ? -e.item.amount : e.item.amount}
            title={e.item.note || (e.kind === "spend" ? jarName(e.item.jar) : "Money in")}
            details={[
              [e.kind === "spend" ? "Jar" : "Type", e.kind === "spend" ? `${JAR_LOOK[e.item.jar].icon} ${jarName(e.item.jar)}` : "💰 Money in"],
              ["Date", fullDateLabel(e.item.date)],
              ["Note", e.item.note || <span className="muted">No note</span>],
              ...(e.kind === "spend" && e.item.fromUntracked ? [["Paid from", "❓ Untracked money"] as [string, string]] : []),
            ]}
            onEdit={() => setViewing(false)}
            onDelete={() => {
              onDelete?.();
              close();
            }}
          />
        )}
      </Sheet>
    );
  }

  return (
    <Sheet title={title} onClose={onClose}>
      {(close) => (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (parsed === null) return;
            const base = { amount: parsed, note: note.trim(), date };
            if (tooBig) return;
            if (kind === "spend") onSaveSpend({ ...base, jar, ...(fromUntracked ? { fromUntracked: true } : {}) });
            else onSaveIncome(base);
            close();
          }}
        >
          {!editing && (
            <div className="segmented" role="radiogroup" aria-label="Type">
              <span className={kind === "spend" ? "seg-thumb" : "seg-thumb right"} aria-hidden />
              {(["spend", "income"] as const).map((k) => (
                <button type="button" key={k} role="radio" aria-checked={kind === k} className={kind === k ? "seg on" : "seg"} onClick={() => setKind(k)}>
                  {k === "spend" ? "Spend" : "Money in"}
                </button>
              ))}
            </div>
          )}

          <label className="amount-wrap">
            <span className="amount-prefix">{kind === "income" ? "+₹" : "₹"}</span>
            <input
              className="amount-input"
              inputMode="decimal"
              placeholder="0"
              autoFocus
              value={amount}
              style={amountWidth(amount)}
              onChange={(e) => setAmount(cleanAmountInput(e.target.value))}
              aria-label="Amount"
            />
          </label>

          {chips.length > 0 && (
            <div className="chips">
              {chips.map((c) => (
                <button
                  type="button"
                  key={c.note}
                  className="chip"
                  onClick={() => {
                    setNote(c.note);
                    setJar(c.jar);
                    setAmount(String(c.amount));
                  }}
                >
                  <span aria-hidden>{JAR_LOOK[c.jar].icon}</span> {c.note} · {rupees(c.amount)}
                </button>
              ))}
            </div>
          )}

          {kind === "spend" && (
            <div className="jar-pick" role="radiogroup" aria-label="Jar">
              {jarChoices.map((j) => (
                <button
                  type="button"
                  key={j.id}
                  role="radio"
                  aria-checked={jar === j.id}
                  className={jar === j.id ? "pick on" : "pick"}
                  style={{ "--c": JAR_LOOK[j.id].color } as CSSProperties}
                  onClick={() => setJar(j.id)}
                >
                  <span className="pick-icon" aria-hidden>
                    {JAR_LOOK[j.id].icon}
                  </span>
                  <span className="pick-name">{j.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="row">
            <label className="field small">
              <span className="field-label">Note</span>
              <input placeholder={kind === "spend" ? "Tea, cab..." : "Salary, refund..."} value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <label className="field small">
              <span className="field-label">Date</span>
              <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </label>
          </div>

          {canUseUntracked && (
            <div className="from-untracked">
              <button type="button" role="switch" aria-checked={fromUntracked} className={fromUntracked ? "mini-chip on" : "mini-chip"} onClick={() => setFlag(!fromUntracked)}>
                {fromUntracked ? "✓ Untracked money (old spend)" : "Untracked money (old spend)"}
              </button>
              {fromUntracked && (
                <span className={tooBig ? "neg small-text" : "muted small-text"}>
                  {tooBig
                    ? `Only ${rupees(room)} is untracked this month. Lower the amount or turn this off.`
                    : `Explains part of the ${rupees(room)} untracked. Your balance stays the same.`}
                </span>
              )}
            </div>
          )}

          {onDelete && (
            <button
              type="button"
              className="danger"
              onClick={() => {
                onDelete();
                close();
              }}
            >
              Delete
            </button>
          )}
          <div className="sheet-foot">
            <button className="primary" type="submit" disabled={parsed === null || tooBig}>
              {editing ? "Save" : parsed ? `Add ${kind === "income" ? "+" : ""}${rupees(parsed)}` : "Add"}
            </button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
