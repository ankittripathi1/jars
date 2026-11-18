import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Icons } from "./ui";
import "@fontsource-variable/dm-sans";
import "./styles.css";

/**
 * If a screen crashes, show what went wrong instead of a blank page.
 * Saved data is not touched, so Reload usually fixes it.
 */
class CrashScreen extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div className="crash">
        <p className="empty-icon" aria-hidden>
          {Icons.alert}
        </p>
        <h1 className="title">Something broke</h1>
        <p className="hint-text">Your data is safe. Reload the app. If it happens again, send this message:</p>
        <pre>{error.message}</pre>
        <button className="primary" onClick={() => location.reload()}>
          Reload
        </button>
      </div>
    );
  }
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CrashScreen>
      <App />
    </CrashScreen>
  </StrictMode>,
);
