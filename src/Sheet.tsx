import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icons } from "./ui";

// Exit is faster than enter: the system responding should feel snappy.
const EXIT_MS = 200;

/**
 * Bottom sheet. Closes by backdrop tap, Escape, or dragging the top bar down.
 * A quick flick closes it too, even if it's short. Dragging up meets growing resistance.
 * `children` gets a `close` function so forms can play the exit animation after saving.
 * `onClose` runs once the exit animation is done.
 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: (close: () => void) => ReactNode }) {
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(0);
  const start = useRef<{ y: number; t: number; id: number } | null>(null);
  const closed = useRef(false);

  const close = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    setClosing(true);
    setTimeout(onClose, EXIT_MS);
  }, [onClose]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    // Keep the page behind from scrolling while the sheet is open.
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [close]);

  const dragging = start.current !== null;

  return (
    <div className={closing ? "backdrop out" : "backdrop"} onClick={close}>
      <div
        className={closing ? "sheet out" : "sheet"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={closing ? undefined : { transform: drag ? `translateY(${drag}px)` : undefined, transition: dragging ? "none" : undefined }}
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
            setDrag(dy >= 0 ? dy : -Math.sqrt(-dy) * 2);
          }}
          onPointerUp={(e) => {
            if (!start.current || e.pointerId !== start.current.id) return;
            const velocity = drag / Math.max(1, performance.now() - start.current.t);
            start.current = null;
            if (drag > 100 || (drag > 24 && velocity > 0.45)) close();
            else setDrag(0);
          }}
          onPointerCancel={() => {
            start.current = null;
            setDrag(0);
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
