import type { CSSProperties } from "react";
import { dayLabel, monthLabel, rupees } from "./format";
import { addMonths, history, jarName, type HistoryItem } from "./money";
import type { Data, FriendEntry, Income, Spend } from "./types";
import { Avatar, Icons, JarIcon, stagger } from "./ui";

type Props = {
  data: Data;
  month: string;
  onMonth: (m: string) => void;
  onEditSpend: (s: Spend) => void;
  onEditIncome: (i: Income) => void;
  onOpenFriend: (f: FriendEntry) => void;
};

/** Every entry of the month in one list, like a UPI app's transaction history. */
export function History({ data, month, onMonth, onEditSpend, onEditIncome, onOpenFriend }: Props) {
  const items = history(data, month);
  const moneyIn = items.filter((x) => x.amount > 0).reduce((s, x) => s + x.amount, 0);
  const moneyOut = items.filter((x) => x.amount < 0).reduce((s, x) => s - x.amount, 0);
  const days = [...new Set(items.map((x) => x.date))];
  const [monthName, year] = monthLabel(month).split(" ");
  let row = 0;

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">History · {year}</p>
          <h1 className="title">{monthName}</h1>
        </div>
        <div className="head-actions">
          <button className="icon-btn tonal" onClick={() => onMonth(addMonths(month, -1))} aria-label="Previous month">
            {Icons.back}
          </button>
          <button className="icon-btn tonal" onClick={() => onMonth(addMonths(month, 1))} aria-label="Next month">
            {Icons.next}
          </button>
        </div>
      </header>

      <section className="in-out enter" style={stagger(0)}>
        <div>
          <span className="muted small-text">Money in</span>
          <b className="pos">+{rupees(moneyIn)}</b>
        </div>
        <div>
          <span className="muted small-text">Money out</span>
          <b>−{rupees(moneyOut)}</b>
        </div>
      </section>

      {items.length === 0 ? (
        <div className="empty enter">
          <p className="empty-icon" aria-hidden>
            🧾
          </p>
          <p>Nothing this month yet.</p>
        </div>
      ) : (
        days.map((day) => {
          const list = items.filter((x) => x.date === day);
          const net = list.reduce((s, x) => s + x.amount, 0);
          return (
            <section key={day}>
              <h3 className="day-head">
                <span>{dayLabel(day)}</span>
                <span>
                  {net > 0 ? "+" : net < 0 ? "−" : ""}
                  {rupees(Math.abs(net))}
                </span>
              </h3>
              <ul className="list">
                {list.map((x) => (
                  <li key={x.item.id} className="enter" style={stagger(1 + row++)}>
                    <Row x={x} onEditSpend={onEditSpend} onEditIncome={onEditIncome} onOpenFriend={onOpenFriend} />
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}

type RowProps = { x: HistoryItem; onEditSpend: (s: Spend) => void; onEditIncome: (i: Income) => void; onOpenFriend: (f: FriendEntry) => void };

function Row({ x, onEditSpend, onEditIncome, onOpenFriend }: RowProps) {
  const amount = (
    <span className={x.amount > 0 ? "list-amount pos" : "list-amount"}>
      {x.amount > 0 ? "+" : "−"}
      {rupees(Math.abs(x.amount))}
    </span>
  );

  if (x.kind === "spend") {
    return (
      <button onClick={() => onEditSpend(x.item)}>
        <JarIcon jar={x.item.jar} />
        <span className="list-text">
          <span className="list-main">{x.item.note || jarName(x.item.jar)}</span>
          <span className="muted small-text">
            {jarName(x.item.jar)} · {dayLabel(x.date)}
          </span>
        </span>
        {amount}
      </button>
    );
  }
  if (x.kind === "income") {
    return (
      <button onClick={() => onEditIncome(x.item)}>
        <span className="jar-icon" style={{ "--c": "var(--pos)", width: 40, height: 40, fontSize: 19 } as CSSProperties} aria-hidden>
          💰
        </span>
        <span className="list-text">
          <span className="list-main">{x.item.note || "Money in"}</span>
          <span className="muted small-text">Money in · {dayLabel(x.date)}</span>
        </span>
        {amount}
      </button>
    );
  }
  return (
    <button onClick={() => onOpenFriend(x.item)}>
      <Avatar name={x.item.person} />
      <span className="list-text">
        <span className="list-main">{x.item.type === "gave" ? `Gave to ${x.item.person}` : `Got from ${x.item.person}`}</span>
        <span className="muted small-text">
          Friends · {dayLabel(x.date)}
          {x.item.note && ` · ${x.item.note}`}
        </span>
      </span>
      {amount}
    </button>
  );
}
