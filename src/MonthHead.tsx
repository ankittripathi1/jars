import { useRef, useState } from "react";
import { monthLabel } from "./format";
import { addMonths, monthOf } from "./money";
import { Sheet } from "./Sheet";
import { today } from "./store";
import { Icons } from "./ui";

// How many past months the picker lists below "This month".
const PAST_MONTHS = 12;

/**
 * Page header for month screens (Home, History).
 * Tap the month name to pick a month. Next stops at the current month, since later months have no data.
 */
export function MonthHead({ eyebrow, month, onMonth }: { eyebrow: string; month: string; onMonth: (m: string) => void }) {
  const [picking, setPicking] = useState(false);
  const current = monthOf(today());
  const monthName = monthLabel(month).split(" ")[0];

  return (
    <header className="page-head">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="title">
          <button className="month-btn" onClick={() => setPicking(true)} aria-label={`${monthLabel(month)}. Pick a month`}>
            {monthName}
            <span className="month-caret" aria-hidden>
              {Icons.down}
            </span>
          </button>
        </h1>
      </div>
      <div className="head-actions">
        <button className="icon-btn tonal" onClick={() => onMonth(addMonths(month, -1))} aria-label="Previous month">
          {Icons.back}
        </button>
        <button className="icon-btn tonal" onClick={() => onMonth(addMonths(month, 1))} disabled={month >= current} aria-label="Next month">
          {Icons.next}
        </button>
      </div>
      {picking && (
        <MonthPicker
          month={month}
          current={current}
          onClose={(picked) => {
            setPicking(false);
            if (picked && picked !== month) onMonth(picked);
          }}
        />
      )}
    </header>
  );
}

/** "This month" and the past months. `onClose` gets the picked month after the exit animation, so the page changes once the sheet is gone. */
function MonthPicker({ month, current, onClose }: { month: string; current: string; onClose: (picked?: string) => void }) {
  const months = Array.from({ length: PAST_MONTHS + 1 }, (_, i) => addMonths(current, -i));
  // A ref, not state: close() already holds the onClose from this render.
  const picked = useRef<string>(undefined);
  return (
    <Sheet title="Pick a month" onClose={() => onClose(picked.current)}>
      {(close) => (
        <ul className="list month-list">
          {months.map((m) => (
            <li key={m}>
              <button
                aria-current={m === month ? "true" : undefined}
                onClick={() => {
                  picked.current = m;
                  close();
                }}
              >
                <span className="list-main">{m === current ? "This month" : monthLabel(m)}</span>
                {m === month && <span className="month-check" aria-hidden>{Icons.check}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
