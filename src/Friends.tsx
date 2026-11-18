import { useState } from "react";
import { EntryView } from "./EntryView";
import { amountWidth, cleanAmountInput, dayLabel, fullDateLabel, parseAmount, rupees } from "./format";
import { friendBalances } from "./money";
import { Sheet } from "./Sheet";
import { newId, today } from "./store";
import type { FriendEntry } from "./types";
import { Avatar, Icons, stagger } from "./ui";

type Props = {
  entries: FriendEntry[];
  // The open person's page, or null for the list. App holds it so the top bar can show Back.
  person: string | null;
  onPerson: (person: string | null) => void;
  onChange: (entries: FriendEntry[]) => void;
  // Shows a snackbar. `undo` adds an Undo button.
  toast: (text: string, undo?: () => void) => void;
};

/** Money given to and got from friends. Separate from the jars. */
export function Friends({ entries, person, onPerson, onChange, toast }: Props) {
  // null = closed, "add" = new entry, or a saved entry to view/edit.
  const [open, setOpen] = useState<"add" | FriendEntry | null>(null);
  const balances = friendBalances(entries);

  const sheet = open && (
    <FriendSheet
      people={balances.map((b) => b.person)}
      defaultPerson={person ?? ""}
      editing={open === "add" ? undefined : open}
      onClose={() => setOpen(null)}
      onSave={(e) => {
        if (open === "add") return onChange([...entries, { ...e, id: newId() }]);
        const id = open.id;
        onChange(entries.map((x) => (x.id === id ? { ...e, id } : x)));
        toast("Saved");
      }}
      onDelete={() => {
        if (open === "add") return;
        const before = entries;
        const rest = entries.filter((x) => x.id !== open.id);
        onChange(rest);
        toast(`Deleted ${rupees(open.amount)}`, () => onChange(before));
      }}
    />
  );

  const addButton = (
    <button className="pill-btn" onClick={() => setOpen("add")} aria-label="Add friend money">
      {Icons.plus}
      <span>Add</span>
    </button>
  );

  if (person !== null) {
    const history = entries
      .map((e, i) => ({ e, i }))
      .filter(({ e }) => e.person === person)
      .sort((a, b) => b.e.date.localeCompare(a.e.date) || b.i - a.i)
      .map(({ e }) => e);
    const balance = balances.find((b) => b.person === person)?.balance ?? 0;
    return (
      <>
        <header className="page-head">
          <button className="icon-btn tonal" onClick={() => onPerson(null)} aria-label="Back">
            {Icons.back}
          </button>
          {addButton}
        </header>
        <div className="detail-head enter" style={stagger(0)}>
          <Avatar name={person} />
          <div>
            <h1 className="title">{person}</h1>
            <p className={balance > 0 ? "pos" : balance < 0 ? "neg" : "muted"}>{balanceText(person, balance)}</p>
          </div>
        </div>
        <ul className="list">
          {history.map((e, i) => (
            <li key={e.id} className="enter" style={stagger(i + 1)}>
              <button onClick={() => setOpen(e)}>
                <span className="list-main">
                  {e.type === "gave" ? "I gave" : "I got"}
                  <span className="muted small-text">
                    {" "}
                    · {dayLabel(e.date)}
                    {e.note && ` · ${e.note}`}
                  </span>
                </span>
                <span className={e.type === "gave" ? "list-amount pos" : "list-amount neg"}>
                  {e.type === "gave" ? "+" : "−"}
                  {rupees(e.amount)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {history.length === 0 && <p className="empty">No entries left.</p>}
        {sheet}
      </>
    );
  }

  return (
    <>
      <header className="page-head">
        <h1 className="title">Friends</h1>
        {addButton}
      </header>
      {balances.length === 0 ? (
        <div className="empty enter">
          <p className="empty-icon" aria-hidden>
            🤝
          </p>
          <p>No friend money yet.</p>
          <p className="muted small-text">Tap + to add "I gave" or "I got".</p>
        </div>
      ) : (
        <ul className="list">
          {balances.map((b, i) => (
            <li key={b.person} className="enter" style={stagger(i)}>
              <button onClick={() => onPerson(b.person)}>
                <Avatar name={b.person} />
                <span className="list-main">{b.person}</span>
                <span className={b.balance > 0 ? "list-amount pos" : b.balance < 0 ? "list-amount neg" : "muted"}>
                  {b.balance > 0 ? `owes you ${rupees(b.balance)}` : b.balance < 0 ? `you owe ${rupees(-b.balance)}` : "settled"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {sheet}
    </>
  );
}

function balanceText(person: string, balance: number): string {
  if (balance > 0) return `${person} owes you ${rupees(balance)}`;
  if (balance < 0) return `You owe ${person} ${rupees(-balance)}`;
  return "All settled";
}

type SheetProps = {
  people: string[];
  defaultPerson: string;
  // A saved entry: opens read-only first, the form shows after tapping Edit.
  editing?: FriendEntry;
  onSave: (e: Omit<FriendEntry, "id">) => void;
  onDelete: () => void;
  onClose: () => void;
};

/** Add, view, or edit one friend money entry. Also used from the History tab. */
export function FriendSheet({ people, defaultPerson, editing, onSave, onDelete, onClose }: SheetProps) {
  const [person, setPerson] = useState(editing?.person ?? defaultPerson);
  const [amount, setAmount] = useState(editing ? String(editing.amount) : "");
  const [type, setType] = useState<FriendEntry["type"]>(editing?.type ?? "gave");
  const [note, setNote] = useState(editing?.note ?? "");
  const [date, setDate] = useState(editing?.date ?? today());
  const [viewing, setViewing] = useState(editing !== undefined);
  const parsed = parseAmount(amount);
  const valid = parsed !== null && person.trim() !== "";

  if (editing && viewing) {
    return (
      <Sheet title="Friend money" onClose={onClose}>
        {(close) => (
          <EntryView
            icon={<Avatar name={editing.person} size={64} />}
            amount={editing.type === "got" ? editing.amount : -editing.amount}
            title={editing.type === "gave" ? `I gave ${editing.person}` : `I got from ${editing.person}`}
            details={[
              ["Person", editing.person],
              ["Type", editing.type === "gave" ? "I gave" : "I got"],
              ["Date", fullDateLabel(editing.date)],
              ["Note", editing.note || <span className="muted">No note</span>],
            ]}
            onEdit={() => setViewing(false)}
            onDelete={() => {
              onDelete();
              close();
            }}
          />
        )}
      </Sheet>
    );
  }

  return (
    <Sheet title={editing ? "Edit friend money" : "Friend money"} onClose={onClose}>
      {(close) => (
        <form
          className="stack"
          onSubmit={(e) => {
            e.preventDefault();
            if (!valid) return;
            onSave({ person: person.trim(), amount: parsed, type, note: note.trim(), date });
            close();
          }}
        >
          <div className="segmented" role="radiogroup" aria-label="Type">
            <span className={type === "gave" ? "seg-thumb" : "seg-thumb right"} aria-hidden />
            {(["gave", "got"] as const).map((t) => (
              <button type="button" key={t} role="radio" aria-checked={type === t} className={type === t ? "seg on" : "seg"} onClick={() => setType(t)}>
                {t === "gave" ? "I gave" : "I got"}
              </button>
            ))}
          </div>
          <label className="amount-wrap">
            <span className="amount-prefix">₹</span>
            <input className="amount-input" inputMode="decimal" placeholder="0" autoFocus value={amount} style={amountWidth(amount)} onChange={(e) => setAmount(cleanAmountInput(e.target.value))} aria-label="Amount" />
          </label>
          <label className="field small">
            <span className="field-label">Person</span>
            <input list="people" placeholder="Name" value={person} onChange={(e) => setPerson(e.target.value)} />
          </label>
          <datalist id="people">
            {people.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
          <div className="row">
            <label className="field small">
              <span className="field-label">Note</span>
              <input placeholder="Optional" value={note} onChange={(e) => setNote(e.target.value)} />
            </label>
            <label className="field small">
              <span className="field-label">Date</span>
              <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
            </label>
          </div>
          <div className="sheet-foot">
            <button className="primary" type="submit" disabled={!valid}>
              Save
            </button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
