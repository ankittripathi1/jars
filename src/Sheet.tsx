import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { Icons } from "./ui";

// Exit is faster than enter: the system responding should feel snappy.
const EXIT_MS = 200;

/**
 * Bottom sheet. Closes by backdrop tap, Escape, or dragging the top bar down.
 * A quick flick closes it too, even if it's short. Dragging up meets growing resistance.
 * Tab stays inside the sheet, and focus goes back to the button that opened it on close.
 * An autoFocus input inside keeps its focus; otherwise the sheet itself takes focus.
 * Put the main button in a `.sheet-foot` as the last child so it stays visible while scrolling.
 * The drag writes the transform straight on the element, so the form inside doesn't re-render per pointer move.
 * `children` gets a `close` function so forms can play the exit animation after saving.
 * `onClose` runs once the exit animation is done.
 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: (close: () => void) => ReactNode }) {
  const [closing, setClosing] = useState(false);
  // Pointer drag in progress, and how far the sheet is pulled (px, + is down).
  const start = useRef<{ y: number; t: number; id: number } | null>(null);
  const drag = useRef(0);
  const closed = useRef(false);
  const sheet = useRef<HTMLDivElement>(null);
  // Read during the first render, before anything in the sheet takes focus.
  const opener = useRef(document.activeElement as HTMLElement | null);
  const visible = useVisibleArea();

  const close = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    setClosing(true);
    setTimeout(onClose, EXIT_MS);
  }, [onClose]);

  useEffect(() => {
    const el = sheet.current;
    if (el && !el.contains(document.activeElement)) el.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && el) trapTab(e, el);
    };
    window.addEventListener("keydown", onKey);
    // Keep the page behind from scrolling while the sheet is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [close]);

  // Give focus back once the sheet is gone. Skip it if the opener was removed (like a deleted row).
  useEffect(
    () => () => {
      if (opener.current?.isConnected) opener.current.focus();
    },
    [],
  );

  // Moves the sheet by `px`. While the finger is down there is no transition, so it follows 1:1.
  const setDrag = (px: number, following: boolean) => {
    drag.current = px;
    const el = sheet.current;
    if (!el) return;
    el.style.transform = px ? `translateY(${px}px)` : "";
    el.style.transition = following ? "none" : "";
  };

  // The exit animation starts from wherever the drag left the sheet. Clear the inline styles in the same frame the "out" class lands.
  useLayoutEffect(() => {
    if (closing && sheet.current) {
      sheet.current.style.transform = "";
      sheet.current.style.transition = "";
    }
  }, [closing]);

  return (
    <div className={closing ? "backdrop out" : "backdrop"} onClick={close} style={visible ? { top: visible.top, bottom: "auto", height: visible.height } : undefined}>
      <div
        className={closing ? "sheet out" : "sheet"}
        ref={sheet}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sheet-head"
          onPointerDown={(e) => {
            if (start.current) return; // ignore a second finger
            start.current = { y: e.clientY, t: performance.now(), id: e.pointerId };
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!start.current || e.pointerId !== start.current.id) return;
            const dy = e.clientY - start.current.y;
            // Down follows the finger. Up gets heavy fast.
            setDrag(dy >= 0 ? dy : -Math.sqrt(-dy) * 2, true);
          }}
          onPointerUp={(e) => {
            if (!start.current || e.pointerId !== start.current.id) return;
            const dy = drag.current;
            const velocity = dy / Math.max(1, performance.now() - start.current.t);
            start.current = null;
            if (dy > 100 || (dy > 24 && velocity > 0.45)) close();
            else setDrag(0, false);
          }}
          onPointerCancel={() => {
            start.current = null;
            setDrag(0, false);
          }}
        >
          <span className="grabber" />
          <div className="sheet-title">
            <h2>{title}</h2>
            <button className="icon-btn" onClick={close} onPointerDown={(e) => e.stopPropagation()} aria-label="Close">
              {Icons.close}
            </button>
          </div>
        </div>
        {children(close)}
      </div>
    </div>
  );
}

/**
 * iOS Safari keeps the page size when the keyboard opens, so a bottom sheet ends up behind it.
 * Returns the part of the screen above the keyboard, or null when nothing covers the page.
 * (Chrome on Android resizes the page itself, because of interactive-widget in index.html.)
 */
function useVisibleArea() {
  const [area, setArea] = useState<{ top: number; height: number } | null>(null);
  useEffect(() => {
    const v = window.visualViewport;
    if (!v) return;
    const fit = () => {
      const next = v.height < window.innerHeight - 1 ? { top: v.offsetTop, height: v.height } : null;
      // Scroll events come fast; only re-render when the area really moved.
      setArea((a) => (a?.top === next?.top && a?.height === next?.height ? a : next));
    };
    fit();
    v.addEventListener("resize", fit);
    v.addEventListener("scroll", fit);
    return () => {
      v.removeEventListener("resize", fit);
      v.removeEventListener("scroll", fit);
    };
  }, []);
  return area;
}

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';

/** Wraps Tab and Shift+Tab around the first and last focusable control in `el`. */
function trapTab(e: KeyboardEvent, el: HTMLElement) {
  const items = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)];
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) return e.preventDefault();
  const at = document.activeElement;
  if (e.shiftKey && (at === first || at === el)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && (at === last || !el.contains(at))) {
    e.preventDefault();
    first.focus();
  }
}
