import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Icons } from "./ui";

const EXIT_MS = 220;

/**
 * Bottom sheet. Closes by backdrop tap, Escape, or dragging the top bar down.
 * `children` gets a `close` function so forms can play the exit animation after saving.
 * `onClose` runs once the exit animation is done.
 */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: (close: () => void) => ReactNode }) {
  const [closing, setClosing] = useState(false);
  const [drag, setDrag] = useState(0);
  const startY = useRef<number | null>(null);
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
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);

  const dragging = startY.current !== null;

  return (
    <div className={closing ? "backdrop out" : "backdrop"} onClick={close}>
      <div
        className="sheet"
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          transform: closing ? "translateY(100%)" : drag ? `translateY(${drag}px)` : undefined,
          transition: dragging ? "none" : undefined,
        }}
      >
        <div
          className="sheet-head"
          onPointerDown={(e) => {
            startY.current = e.clientY;
            (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => startY.current !== null && setDrag(Math.max(0, e.clientY - startY.current))}
          onPointerUp={() => {
            startY.current = null;
            if (drag > 90) close();
            else setDrag(0);
          }}
          onPointerCancel={() => {
            startY.current = null;
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
