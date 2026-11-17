import type { CSSProperties } from "react";
import { dayLabel, monthLabel, rupees } from "./format";
import { addMonths, balance, EXTRA_JARS, jarName, jarSpent, jarSummaries, needsFixedSpends, overallRemaining, spendsInMonth } from "./money";
import type { Data, JarId, Spend } from "./types";
import { Icons, JAR_LOOK, JarIcon, stagger, useCountUp } from "./ui";

type HomeProps = {
  data: Data;
  month: string;
  isCurrentMonth: boolean;
  onMonth: (m: string) => void;
  onOpenJar: (jar: JarId) => void;
  onAddFixed: () => void;
  onCheckBalance: () => void;
};

/** Month overview: real money left, this month's plan, then one card per jar. */
export function Home({ data, month, isCurrentMonth, onMonth, onOpenJar, onAddFixed, onCheckBalance }: HomeProps) {
  const jars = jarSummaries(data, month);
  const remaining = overallRemaining(data, month);
  const income = data.settings.income;
  const spent = income - remaining;
  const money = balance(data);
  const shownMoney = useCountUp(money ?? 0);
  const shownRemaining = useCountUp(remaining);
  const fixedTotal = data.settings.fixed.reduce((s, f) => s + f.amount, 0);
  const [monthName, year] = monthLabel(month).split(" ");
  const extras = EXTRA_JARS.map((j) => ({ ...j, spent: jarSpent(data, month, j.id) })).filter((j) => j.spent > 0);

  return (
    <>
      <header className="page-head">
        <div>
          <p className="eyebrow">{year}</p>
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

      <section className="hero enter" style={stagger(0)}>
        <div className="hero-row">
          <span className="hero-label">Money left now</span>
          {money !== null && (
            <button className="hero-chip" onClick={onCheckBalance}>
              Check
            </button>
          )}
        </div>
        {money !== null ? (
          <strong className={money < 0 ? "hero-num neg" : "hero-num"}>{rupees(shownMoney)}</strong>
        ) : (
          <div className="hero-setup">
            <span>Tell the app how much money you have right now. It will find what you didn't track.</span>
            <button className="primary small" onClick={onCheckBalance}>
              Set balance
            </button>
          </div>
        )}

        <div className="hero-month">
          <div className="hero-foot">
            <span>This month's plan</span>
            <span className={remaining < 0 ? "neg" : ""}>
              {rupees(shownRemaining)} left of {rupees(income)}
            </span>
          </div>
          <div className="bar hero-bar">
            <div style={{ transform: `scaleX(${income > 0 ? Math.min(1, Math.max(0, spent / income)) : 0})` }} />
          </div>
        </div>
      </section>

      {income === 0 && (
        <section className="banner enter" style={stagger(1)}>
          <span className="banner-icon" aria-hidden>
            👋
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
            📌
          </span>
          <span className="banner-text">
            <b>Add salary and fixed spends?</b>
            <span className="muted">
              +{rupees(income)} salary · {data.settings.fixed.length} spends, {rupees(fixedTotal)}
            </span>
          </span>
          <button className="primary small" onClick={onAddFixed}>
            Add
          </button>
        </section>
      )}

      <h2 className="section-title">Jars</h2>
      <section className="jars">
        {jars.map((j, i) => {
          const ratio = j.limit > 0 ? Math.min(1, j.spent / j.limit) : j.spent > 0 ? 1 : 0;
          const over = j.spent > j.limit;
          return (
            <button key={j.id} className="jar enter" style={{ ...stagger(i + 2), "--c": JAR_LOOK[j.id].color } as CSSProperties} onClick={() => onOpenJar(j.id)}>
              <JarIcon jar={j.id} />
              <div className="jar-body">
                <div className="jar-top">
                  <span className="jar-name">{j.name}</span>
                  <span className={over ? "jar-left neg" : "jar-left"}>{over ? `${rupees(-j.left)} over` : `${rupees(j.left)} left`}</span>
                </div>
                <div className={over ? "bar over" : "bar"}>
                  <div style={{ transform: `scaleX(${ratio})` }} />
                </div>
                <span className="muted small-text">
                  {rupees(j.spent)} of {rupees(j.limit)}
                </span>
              </div>
            </button>
          );
        })}
        {extras.map((j, i) => (
          <button key={j.id} className="jar outside enter" style={stagger(jars.length + 2 + i)} onClick={() => onOpenJar(j.id)}>
            <JarIcon jar={j.id} />
            <div className="jar-body">
              <div className="jar-top">
                <span className="jar-name">{j.name}</span>
                <span className="jar-left">{rupees(j.spent)} spent</span>
              </div>
            </div>
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
  const list = spendsInMonth(data.spends, month)
    .map((s, i) => ({ s, i }))
    .filter(({ s }) => s.jar === jar)
    .sort((a, b) => b.s.date.localeCompare(a.s.date) || b.i - a.i)
    .map(({ s }) => s);
  const summary = jarSummaries(data, month).find((j) => j.id === jar);
  const total = list.reduce((sum, s) => sum + s.amount, 0);
  const days = [...new Set(list.map((s) => s.date))];
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
        days.map((day) => (
          <section key={day}>
            <h3 className="day-head">{dayLabel(day)}</h3>
            <ul className="list">
              {list
                .filter((s) => s.date === day)
                .map((s) => (
                  <li key={s.id} className="enter" style={stagger(2 + row++)}>
                    <button onClick={() => onEdit(s)}>
                      <span className="list-main">{s.note || "No note"}</span>
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
