// Small shared UI pieces: one SVG icon set (24px grid, currentColor), jar colors, animated numbers.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { rupees } from "./format";
import type { JarId } from "./types";

/** Round tinted circle with the jar's icon. */
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
  check: svg(<path d="M5 12.5l4.5 4.5L19 7.5" />),
  // Jars
  home: svg(
    <>
      <path d="M3 10.5L12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5M10 20v-5h4v5" />
    </>,
  ),
  growth: svg(
    <>
      <path d="M3 17l6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>,
  ),
  lifebuoy: svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4" />
      <path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6" />
    </>,
  ),
  book: svg(
    <>
      <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z" />
      <path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20v-3" />
    </>,
  ),
  star: svg(<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />),
  gift: svg(
    <>
      <rect x="3" y="8" width="18" height="4" rx="1" />
      <path d="M5 12v8h14v-8M12 8v12" />
      <path d="M12 8S10.5 3.5 8 4.2 7.5 8 12 8zM12 8s1.5-4.5 4-3.8.5 3.8-4 3.8z" />
    </>,
  ),
  sparkles: svg(
    <>
      <path d="M11 3l1.8 5.2L18 10l-5.2 1.8L11 17l-1.8-5.2L4 10l5.2-1.8z" />
      <path d="M18.5 15l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z" />
    </>,
  ),
  help: svg(
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6v.4M12 17h.01" />
    </>,
  ),
  // Other screens
  wallet: svg(
    <>
      <path d="M4 7a2 2 0 0 1 2-2h12v4" />
      <path d="M4 7v11a2 2 0 0 0 2 2h14V9H6a2 2 0 0 1-2-2zM16 14.5h.01" />
    </>,
  ),
  receipt: svg(
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
      <path d="M9 8h6M9 12h6" />
    </>,
  ),
  calendar: svg(
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>,
  ),
  alert: svg(
    <>
      <path d="M12 3L2 20h20z" />
      <path d="M12 10v4M12 17h.01" />
    </>,
  ),
};

/** Color and icon per jar. The colors are for fills; text, icons and borders use the --ink variant in styles.css. */
export const JAR_LOOK: Record<JarId, { color: string; icon: ReactNode }> = {
  necessities: { color: "#4f7dd9", icon: Icons.home },
  freedom: { color: "#3e9e6e", icon: Icons.growth },
  longterm: { color: "#d9963a", icon: Icons.lifebuoy },
  education: { color: "#8e6bd9", icon: Icons.book },
  play: { color: "#d95b8c", icon: Icons.star },
  give: { color: "#d96b4f", icon: Icons.gift },
  outside: { color: "#7a8494", icon: Icons.sparkles },
  untracked: { color: "#a0786a", icon: Icons.help },
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
