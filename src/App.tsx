import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { BalanceSheet } from "./BalanceSheet";
import { monthLabel, rupees } from "./format";
import { Friends, FriendSheet } from "./Friends";
import { History } from "./History";
import { Home, JarDetail } from "./Home";
import { Onboarding } from "./Onboarding";
import { addFixedSpends, jarName, monthOf, setBalance, untracked } from "./money";
import { Settings } from "./Settings";
import { SpendSheet } from "./SpendSheet";
import { newId, today, useData } from "./store";
import type { FriendEntry, Income, JarId, Spend } from "./types";
import { haptic, Icons, useScrolled } from "./ui";

type Tab = "home" | "history" | "friends" | "settings";
type SheetState = { mode: "add" } | { mode: "edit"; kind: "spend"; item: Spend } | { mode: "edit"; kind: "income"; item: Income } | { mode: "balance" } | { mode: "friend"; item: FriendEntry } | null;
// Which way the page slides in: next month/deeper = "fwd", back = "back".
type Dir = "fwd" | "back" | "none";
type Toast = { id: number; text: string; undo?: () => void };

const LAST_JAR_KEY = "jars-last-jar";

function loadLastJar(): JarId {
  try {
    return (localStorage.getItem(LAST_JAR_KEY) as JarId | null) ?? "play";
  } catch {
    return "play";
  }
}

const TABS: { id: Tab; label: string; icon: ReactNode }[] = [
  { id: "home", label: "Jars", icon: Icons.jars },
  { id: "history", label: "History", icon: Icons.history },
  { id: "friends", label: "Friends", icon: Icons.friends },
  { id: "settings", label: "Settings", icon: Icons.settings },
];

export function App() {
  const [data, update] = useData();
  const [tab, setTab] = useState<Tab>("home");
  const currentMonth = monthOf(today());
  const [month, setMonth] = useState(currentMonth);
  const [openJar, setOpenJar] = useState<JarId | null>(null);
  const [openFriend, setOpenFriend] = useState<string | null>(null);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [lastJar, setLastJar] = useState<JarId>(loadLastJar);
  const [dir, setDir] = useState<Dir>("none");
  const [toast, setToast] = useState<Toast | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const scrolled = useScrolled();

  const showToast = useCallback((text: string, undo?: () => void) => {
    clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, undo });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  function rememberJar(jar: JarId) {
    setLastJar(jar);
    try {
      localStorage.setItem(LAST_JAR_KEY, jar);
    } catch {
      // Not important if this fails.
    }
  }

  // Undo for any change: put the whole data back as it was.
  function change(fn: (d: typeof data) => typeof data, text: string, undoable = true) {
    const before = data;
    update(fn);
    haptic();
    showToast(text, undoable ? () => update(() => before) : undefined);
  }

  function saveSpend(s: Omit<Spend, "id">) {
    if (sheet?.mode === "edit") {
      const id = sheet.item.id;
      change((d) => ({ ...d, spends: d.spends.map((x) => (x.id === id ? { ...s, id } : x)) }), "Saved");
    } else {
      change(
        (d) => ({ ...d, spends: [...d.spends, { ...s, id: newId() }] }),
        s.fromUntracked ? `Explained ${rupees(s.amount)} of Untracked` : `Added ${rupees(s.amount)} to ${jarName(s.jar)}`,
      );
      rememberJar(s.jar);
    }
  }

  function saveIncome(i: Omit<Income, "id">) {
    if (sheet?.mode === "edit") {
      const id = sheet.item.id;
      change((d) => ({ ...d, incomes: d.incomes.map((x) => (x.id === id ? { ...i, id } : x)) }), "Saved");
    } else {
      change((d) => ({ ...d, incomes: [...d.incomes, { ...i, id: newId() }] }), `Added +${rupees(i.amount)} money in`);
    }
  }

  function deleteEditing() {
    if (sheet?.mode !== "edit") return;
    const { id, amount } = sheet.item;
    if (sheet.kind === "spend") change((d) => ({ ...d, spends: d.spends.filter((x) => x.id !== id) }), `Deleted ${rupees(amount)}`);
    else change((d) => ({ ...d, incomes: d.incomes.filter((x) => x.id !== id) }), `Deleted +${rupees(amount)}`);
  }

  // Sets direction first so the new page plays its enter animation that way.
  const go = (d: Dir, fn: () => void) => {
    setDir(d);
    fn();
  };
  const changeMonth = (m: string) => go(m > month ? "fwd" : "back", () => setMonth(m));

  const pageKey = `${tab}-${openJar ?? ""}-${openFriend ?? ""}-${month}`;
  // New page starts at the top, like a native app.
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [pageKey]);

  // Small title in the top bar once the big page title scrolls away.
  const barTitle =
    tab === "home"
      ? openJar
        ? jarName(openJar)
        : monthLabel(month)
      : tab === "history"
        ? `History · ${monthLabel(month)}`
        : tab === "friends"
          ? (openFriend ?? "Friends")
          : "Settings";

  // Detail screens (a jar, a friend) get Back in the top bar too, so it never scrolls away.
  const back =
    tab === "home" && openJar
      ? () => go("back", () => setOpenJar(null))
      : tab === "friends" && openFriend !== null
        ? () => go("back", () => setOpenFriend(null))
        : null;

  // First open: the setup asks things in the right order before the app shows.
  if (!data.onboarded) return <Onboarding data={data} onDone={(d) => update(() => d)} />;

  return (
    <div className="app">
      <header className={scrolled ? "topbar on" : "topbar"} aria-hidden={!scrolled}>
        {back && (
          <button className="icon-btn topbar-back" onClick={back} tabIndex={scrolled ? 0 : -1} aria-label="Back">
            {Icons.back}
          </button>
        )}
        <span>{barTitle}</span>
      </header>
      <main key={pageKey} className={`page ${dir}`}>
        {tab === "home" &&
          (openJar ? (
            <JarDetail data={data} month={month} jar={openJar} onBack={() => go("back", () => setOpenJar(null))} onEdit={(item) => setSheet({ mode: "edit", kind: "spend", item })} />
          ) : (
            <Home
              data={data}
              month={month}
              isCurrentMonth={month === currentMonth}
              onMonth={changeMonth}
              onOpenJar={(j) => go("fwd", () => setOpenJar(j))}
              onAddFixed={() => change((d) => addFixedSpends(d, month, newId), "Salary and fixed spends added")}
              onEditBalance={() => setSheet({ mode: "balance" })}
            />
          ))}
        {tab === "history" && (
          <History
            data={data}
            month={month}
            onMonth={changeMonth}
            onEditSpend={(item) => setSheet({ mode: "edit", kind: "spend", item })}
            onEditIncome={(item) => setSheet({ mode: "edit", kind: "income", item })}
            onOpenFriend={(item) => setSheet({ mode: "friend", item })}
          />
        )}
        {tab === "friends" && (
          <Friends
            entries={data.friends}
            person={openFriend}
            onPerson={(p) => go(p === null ? "back" : "fwd", () => setOpenFriend(p))}
            onChange={(friends) => update((d) => ({ ...d, friends }))}
            toast={showToast}
          />
        )}
        {tab === "settings" && (
          <Settings
            data={data}
            onSettings={(settings) => update((d) => ({ ...d, settings }))}
            onName={(name) => update((d) => ({ ...d, name: name || undefined }))}
            onRunSetup={() => update((d) => ({ ...d, onboarded: false }))}
            onRestore={(d) => change(() => d, "Backup restored")}
          />
        )}
      </main>

      {toast && (
        <div className="toast" key={toast.id} role="status">
          <span>{toast.text}</span>
          {toast.undo && (
            <button
              onClick={() => {
                toast.undo?.();
                setToast(null);
              }}
            >
              Undo
            </button>
          )}
        </div>
      )}

      <nav className="tabs" aria-label="Main">
        {TABS.map((t, i) => (
          <Fragment key={t.id}>
            {i === 2 && (
              <button className="nav-add" onClick={() => setSheet({ mode: "add" })} aria-label="Add spend or money in">
                {Icons.plus}
              </button>
            )}
            <button
              className={tab === t.id ? "tab on" : "tab"}
              aria-current={tab === t.id ? "page" : undefined}
              onClick={() => {
                if (tab === t.id && !openJar && openFriend === null) return;
                go("none", () => {
                  setTab(t.id);
                  setOpenJar(null);
                  setOpenFriend(null);
                });
              }}
            >
              <span className="tab-pill">{t.icon}</span>
              <span className="tab-label">{t.label}</span>
            </button>
          </Fragment>
        ))}
      </nav>

      {sheet?.mode === "friend" && (
        <FriendSheet
          people={[...new Set(data.friends.map((f) => f.person))]}
          defaultPerson={sheet.item.person}
          editing={sheet.item}
          onSave={(e) => {
            const id = sheet.item.id;
            change((d) => ({ ...d, friends: d.friends.map((x) => (x.id === id ? { ...e, id } : x)) }), "Saved");
          }}
          onDelete={() => {
            const { id, amount } = sheet.item;
            change((d) => ({ ...d, friends: d.friends.filter((x) => x.id !== id) }), `Deleted ${rupees(amount)}`);
          }}
          onClose={() => setSheet(null)}
        />
      )}
      {sheet?.mode === "balance" && (
        <BalanceSheet
          data={data}
          onSave={(actual) => change((d) => setBalance(d, actual, today(), newId), `Balance set to ${rupees(actual)}`)}
          onClose={() => setSheet(null)}
        />
      )}
      {(sheet?.mode === "add" || sheet?.mode === "edit") && (
        <SpendSheet
          spends={data.spends}
          editing={sheet.mode === "edit" ? (sheet.kind === "spend" ? { kind: "spend", item: sheet.item } : { kind: "income", item: sheet.item }) : undefined}
          defaultJar={openJar && openJar !== "untracked" ? openJar : lastJar}
          untrackedLeft={(m) => untracked(data, m)}
          onSaveSpend={saveSpend}
          onSaveIncome={saveIncome}
          onDelete={sheet.mode === "edit" ? deleteEditing : undefined}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}
