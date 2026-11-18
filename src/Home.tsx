import { useMemo, useState, type CSSProperties } from "react";
import { dayLabel, monthLabel, rupees } from "./format";
import { balance, EXTRA_JARS, groupByDay, jarName, jarSpent, jarSummaries, needsFixedSpends, overallRemaining, spendsInMonth, untracked } from "./money";
import { MonthHead } from "./MonthHead";
import type { Data, JarId, Spend } from "./types";
import { CountUp, Icons, JAR_LOOK, JarIcon, Ring, stagger } from "./ui";

type HomeProps = {
  data: Data;
  month: string;
  isCurrentMonth: boolean;
  onMonth: (m: string) => void;
  onOpenJar: (jar: JarId) => void;
  onAddFixed: () => void;
  // Opens the balance sheet: fix the number, or compare with the bank.
  onEditBalance: () => void;
};

const HIDE_KEY = "jars-hide-amounts";

function loadHidden(): boolean {
  try {
    return localStorage.getItem(HIDE_KEY) === "1";
  } catch {
    return false;
  }
}

/** Month overview: real money left, this month's plan, then one card per jar. The eye button hides every amount here. */
export function Home({ data, month, isCurrentMonth, onMonth, onOpenJar, onAddFixed, onEditBalance }: HomeProps) {
  // Only when the data or month changes, not on every App render (a toast, a sheet opening).
  const { jars, remaining, money, extras } = useMemo(
    () => ({
      jars: jarSummaries(data, month),
      remaining: overallRemaining(data, month),
      money: balance(data),
      // Untracked = stored entries (from older months) + this month's live amount.
      extras: EXTRA_JARS.map((j) => ({ ...j, spent: jarSpent(data, month, j.id) + (j.id === "untracked" ? untracked(data, month) : 0) })).filter(
        (j) => j.spent > 0,
      ),
    }),
    [data, month],
  );
  const income = data.settings.income;
  const spent = income - remaining;
  const fixedTotal = data.settings.fixed.reduce((s, f) => s + f.amount, 0);
  const year = monthLabel(month).split(" ")[1];
  const [hidden, setHidden] = useState(loadHidden);
  // Every amount on this screen goes through this, so hiding covers all of them.
  const show = (n: number) => (hidden ? "₹••••" : rupees(n));

  function toggleHidden() {
    setHidden(!hidden);
    try {
      localStorage.setItem(HIDE_KEY, hidden ? "0" : "1");
    } catch {
      // Still hidden for this session.
    }
  }

  return (
    <>
      <MonthHead eyebrow={data.name ? `Hi ${data.name} · ${year}` : (year ?? "")} month={month} onMonth={onMonth} />

      <section className="hero enter" style={stagger(0)}>
        <div className="hero-row">
          <span className="hero-label">Money left now</span>
          <span className="hero-actions">
            <button className="icon-btn hero-eye" onClick={toggleHidden} aria-pressed={hidden} aria-label={hidden ? "Show amounts" : "Hide amounts"}>
              {hidden ? Icons.eyeOff : Icons.eye}
            </button>
            {money !== null && (
              <button className="hero-chip" onClick={onEditBalance}>
                Edit
              </button>
            )}
          </span>
        </div>
        {money !== null ? (
          <button className="hero-num-btn" onClick={onEditBalance} aria-label={`Money left ${hidden ? "hidden" : rupees(money)}. Edit balance`}>
            <strong className={money < 0 && !hidden ? "hero-num neg" : "hero-num"}>{hidden ? show(money) : <CountUp value={money} />}</strong>
          </button>
        ) : (
          <div className="hero-setup">
            <span>Tell the app how much money you have right now. It will find what you didn't track.</span>
            <button className="primary small" onClick={onEditBalance}>
              Set balance
            </button>
          </div>
        )}

        <div className="hero-month">
          <dl className="hero-stats">
            <div>
              <dt>Plan left</dt>
              <dd className={remaining < 0 && !hidden ? "neg" : ""}>{show(remaining)}</dd>
            </div>
            <div>
              <dt>Spent</dt>
              <dd>{show(spent)}</dd>
            </div>
            <div>
              <dt>Income</dt>
              <dd>{show(income)}</dd>
            </div>
          </dl>
          <div className="bar hero-bar">
            <div style={{ transform: `scaleX(${income > 0 ? Math.min(1, Math.max(0, spent / income)) : 0})` }} />
          </div>
        </div>
      </section>

      {income === 0 && (
        <section className="banner enter" style={stagger(1)}>
          <span className="banner-icon" aria-hidden>
            {Icons.wallet}
          </span>
          <span className="banner-text">
            <b>Set your monthly income</b>
            <span className="muted">Go to Settings. Jar limits come from it.</span>
          </span>
        </section>
      )}

      {isCurrentMonth && needsFixedSpends(data, month) && (
        <section className="banner enter" style={stagger(1)}>
          <span className="banner-icon" aria-hidden>
            {Icons.calendar}
          </span>
          <span className="banner-text">
            <b>Add salary and fixed spends?</b>
            <span className="muted">
              +{show(income)} salary · {data.settings.fixed.length} spends, {show(fixedTotal)}
            </span>
          </span>
          <button className="primary small" onClick={onAddFixed}>
            Add
          </button>
        </section>
      )}

      <h2 className="section-title">Jars</h2>
      <section className="jar-list">
        {jars.map((j, i) => {
          const ratio = j.limit > 0 ? j.spent / j.limit : j.spent > 0 ? 1 : 0;
          const over = j.spent > j.limit;
          return (
            <button key={j.id} className="jar-row enter" style={{ ...stagger(i + 2), "--c": JAR_LOOK[j.id].color } as CSSProperties} onClick={() => onOpenJar(j.id)}>
              <Ring jar={j.id} ratio={ratio} over={over} size={40} />
              <span className="jar-row-text">
                <span className="jar-row-name">{j.name}</span>
                <span className="jar-row-sub">
                  {show(j.spent)} of {show(j.limit)}
                </span>
              </span>
              <span className={over ? "jar-row-left neg" : "jar-row-left"}>
                {show(over ? -j.left : j.left)}
                <small>{over ? "over" : "left"}</small>
              </span>
            </button>
          );
        })}
        {extras.map((j, i) => (
          <button key={j.id} className="jar-row enter" style={stagger(jars.length + 2 + i)} onClick={() => onOpenJar(j.id)}>
            <JarIcon jar={j.id} size={40} />
            <span className="jar-row-text">
              <span className="jar-row-name">{j.name}</span>
              <span className="jar-row-sub">{j.id === "untracked" ? "Money gone, reason unknown" : "Not part of any limit"}</span>
            </span>
            <span className="jar-row-left">
              {show(j.spent)}
              <small>{j.id === "untracked" ? "untracked" : "spent"}</small>
            </span>
          </button>
        ))}
      </section>
    </>
  );
}

type JarDetailProps = {
  data: Data;
  month: string;
  jar: JarId;
  onBack: () => void;
  onEdit: (spend: Spend) => void;
};

/** All spends of one jar in a month, grouped by day, newest first. Tap one to edit it. */
export function JarDetail({ data, month, jar, onBack, onEdit }: JarDetailProps) {
  const { list, days, summary, liveUntracked, storedUntracked } = useMemo(() => {
    const list = spendsInMonth(data.spends, month)
      .map((s, i) => ({ s, i }))
      // The Untracked page also lists old spends marked "Untracked money": they explain part of it.
      .filter(({ s }) => s.jar === jar || (jar === "untracked" && s.fromUntracked))
      .sort((a, b) => b.s.date.localeCompare(a.s.date) || b.i - a.i)
      .map(({ s }) => s);
    return {
      list,
      days: groupByDay(list),
      summary: jarSummaries(data, month).find((j) => j.id === jar),
      liveUntracked: jar === "untracked" ? untracked(data, month) : 0,
      storedUntracked: jar === "untracked" ? jarSpent(data, month, "untracked") : 0,
    };
  }, [data, month, jar]);
  const total = list.reduce((sum, s) => sum + s.amount, 0);
  const ratio = summary && summary.limit > 0 ? Math.min(1, summary.spent / summary.limit) : 0;
  const over = summary ? summary.spent > summary.limit : false;
  let row = 0;

  return (
    <>
      <header className="page-head">
        <button className="icon-btn tonal" onClick={onBack} aria-label="Back">
          {Icons.back}
        </button>
      </header>
      <div className="detail-head enter" style={{ ...stagger(0), "--c": JAR_LOOK[jar].color } as CSSProperties}>
        <JarIcon jar={jar} size={56} />
        <div>
          <h1 className="title">{jarName(jar)}</h1>
          <p className="muted">{monthLabel(month)}</p>
        </div>
      </div>

      <section className="card enter" style={{ ...stagger(1), "--c": JAR_LOOK[jar].color } as CSSProperties}>
        {summary ? (
          <>
            <div className="jar-top">
              <span className="muted">
                {rupees(summary.spent)} of {rupees(summary.limit)}
              </span>
              <b className={over ? "neg" : ""}>{over ? `${rupees(-summary.left)} over` : `${rupees(summary.left)} left`}</b>
            </div>
            <div className={over ? "bar over" : "bar"}>
              <div style={{ transform: `scaleX(${ratio})` }} />
            </div>
          </>
        ) : jar === "untracked" ? (
          <>
            <div className="jar-top">
              <span className="muted">Still untracked</span>
              <b className={liveUntracked > 0 ? "neg" : ""}>{rupees(liveUntracked + storedUntracked)}</b>
            </div>
            <p className="hint-text detail-hint">
              Money that left but no entry explains it. When you remember a spend, add it and turn on "Untracked money (old spend)". It shows up
              here and this number goes down.
            </p>
          </>
        ) : (
          <div className="jar-top">
            <span className="muted">Not part of any jar limit</span>
            <b>{rupees(total)} spent</b>
          </div>
        )}
      </section>

      {list.length === 0 ? (
        <p className="empty">No spends here yet.</p>
      ) : (
        days.map(({ day, items }) => (
          <section key={day}>
            <h3 className="day-head">{dayLabel(day)}</h3>
            <ul className="list">
              {items.map((s) => (
                  <li key={s.id} className="enter" style={stagger(2 + row++)}>
                    <button onClick={() => onEdit(s)}>
                      <span className="list-main">
                        {s.note || "No note"}
                        {jar === "untracked" && s.jar !== "untracked" && <span className="muted small-text"> · {jarName(s.jar)}</span>}
                      </span>
                      <span className="list-amount">{rupees(s.amount)}</span>
                    </button>
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}
