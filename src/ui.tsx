// Small shared UI pieces: jar colors and icons, nav icons, animated numbers.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { rupees } from "./format";
import type { JarId } from "./types";

/** Color and emoji per jar. Colors are tuned to read on light and dark surfaces. */
export const JAR_LOOK: Record<JarId, { color: string; icon: string }> = {
  necessities: { color: "#4f7dd9", icon: "🏠" },
  freedom: { color: "#3e9e6e", icon: "📈" },
  longterm: { color: "#d9963a", icon: "🛟" },
  education: { color: "#8e6bd9", icon: "📚" },
  play: { color: "#d95b8c", icon: "🎉" },
  give: { color: "#d96b4f", icon: "🎁" },
  outside: { color: "#7a8494", icon: "✨" },
  untracked: { color: "#a0786a", icon: "❓" },
};

/** Round tinted circle with the jar's emoji. */
export function JarIcon({ jar, size = 40 }: { jar: JarId; size?: number }) {
  const look = JAR_LOOK[jar];
  return (
    <span className="jar-icon" style={{ "--c": look.color, width: size, height: size, fontSize: size * 0.48 } as CSSProperties} aria-hidden>
      {look.icon}
    </span>
  );
}

/** Round tinted circle with a person's first letter. */
export function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  const hues = ["#4f7dd9", "#3e9e6e", "#d9963a", "#8e6bd9", "#d95b8c", "#d96b4f"];
  const sum = [...name].reduce((s, ch) => s + ch.charCodeAt(0), 0);
  return (
    <span className="jar-icon" style={{ "--c": hues[sum % hues.length], width: size, height: size, fontSize: size * 0.42 } as CSSProperties} aria-hidden>
      <b>{name.trim().charAt(0).toUpperCase() || "?"}</b>
    </span>
  );
}

const svg = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    {path}
  </svg>
);

export const Icons = {
  jars: svg(
    <>
      <path d="M7 4h10M8 4v3a4 4 0 0 0-3 3.9V18a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7.1A4 4 0 0 0 16 7V4" />
      <path d="M5 13h14" />
    </>,
  ),
  friends: svg(
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
      <path d="M16 4.5a3.5 3.5 0 0 1 0 7M18.5 14.5A6.5 6.5 0 0 1 21.5 20" />
    </>,
  ),
  settings: svg(
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </>,
  ),
  history: svg(
    <>
      <path d="M8 6h13M8 12h13M8 18h13" />
      <path d="M3 6h.01M3 12h.01M3 18h.01" />
    </>,
  ),
  plus: svg(<path d="M12 5v14M5 12h14" />),
  back: svg(<path d="M15 18l-6-6 6-6" />),
  next: svg(<path d="M9 18l6-6-6-6" />),
  down: svg(<path d="M6 9l6 6 6-6" />),
  close: svg(<path d="M18 6L6 18M6 6l12 12" />),
};

const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

/**
 * Money number that animates from its old value to the new one (ease-out, ~450ms).
 * It writes the text straight to the DOM, so the screen around it does not re-render each frame.
 * React never owns the text inside the span; only this effect sets it.
 */
export function CountUp({ value, ms = 450 }: { value: number; ms?: number }) {
  const el = useRef<HTMLSpanElement>(null);
  const from = useRef(value);

  // Layout effect so the first number is there before paint.
  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    const start = from.current;
    if (start === value || reducedMotion()) {
      from.current = value;
      node.textContent = rupees(value);
      return;
    }
    const t0 = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      const eased = 1 - Math.pow(1 - p, 3);
      const v = p < 1 ? Math.round(start + (value - start) * eased) : value;
      from.current = v;
      node.textContent = rupees(v);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);

  return <span ref={el} />;
}

/** Stagger index for list enter animations: style={stagger(i)}. */
export const stagger = (i: number) => ({ "--i": Math.min(i, 12) }) as CSSProperties;

/** Short buzz on phones that support it (Android). Confirms a save without looking. */
export function haptic() {
  try {
    navigator.vibrate?.(8);
  } catch {
    // Not supported. Fine.
  }
}

/** True once the page is scrolled past the big title. Drives the small top bar. */
export function useScrolled(offset = 56): boolean {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > offset);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [offset]);
  return scrolled;
}

/** Circular progress around the jar emoji. `ratio` is 0..1 of the limit used. */
export function Ring({ jar, ratio, over, size = 52 }: { jar: JarId; ratio: number; over: boolean; size?: number }) {
  const stroke = Math.max(3, Math.round(size / 11));
  const r = (size - stroke) / 2;
  const len = 2 * Math.PI * r;
  const look = JAR_LOOK[jar];
  return (
    <span className={over ? "ring over" : "ring"} style={{ "--c": look.color, "--len": len, width: size, height: size } as CSSProperties} aria-hidden>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size}>
        <circle className="ring-track" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} />
        {ratio > 0 && (
          <circle className="ring-fill" cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} strokeDasharray={len} strokeDashoffset={len * (1 - Math.min(1, ratio))} />
        )}
      </svg>
      <span className="ring-icon" style={{ fontSize: size * 0.4 }}>
        {look.icon}
      </span>
    </span>
  );
}
