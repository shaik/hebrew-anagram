import { useEffect, useRef, useState } from "react";
import {
  SHARE_BUTTON_ARIA,
  SHARE_BUTTON_LABEL,
  SHARE_COPIED,
  SHARE_FAILED,
  SHARE_TITLE,
} from "../strings";

interface ShareButtonProps {
  url: string;
}

type Feedback = { kind: "none" } | { kind: "copied" } | { kind: "failed" };

const FEEDBACK_MS = 1800;

export function ShareButton({ url }: ShareButtonProps) {
  const [feedback, setFeedback] = useState<Feedback>({ kind: "none" });
  const timeoutRef = useRef<number | null>(null);

  // Cancel any in-flight feedback timer when the component unmounts so we
  // don't call setState on an unmounted component.
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const showFeedback = (next: Feedback) => {
    setFeedback(next);
    if (timeoutRef.current !== null) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setFeedback({ kind: "none" });
      timeoutRef.current = null;
    }, FEEDBACK_MS);
  };

  const handleShare = async () => {
    // Prefer the native share sheet on mobile. It returns a promise that
    // rejects with AbortError when the user dismisses it — that's not a real
    // failure, so we swallow it silently.
    if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
      try {
        await navigator.share({ title: SHARE_TITLE, url });
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        // Fall through to clipboard fallback for any other share failure.
      }
    }

    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        await navigator.clipboard.writeText(url);
        showFeedback({ kind: "copied" });
        return;
      }
      // Older browsers without the Clipboard API: very old, but fall back to
      // a textarea + execCommand. Keeps the share button useful on the long
      // tail without bloating the bundle.
      const ta = document.createElement("textarea");
      ta.value = url;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      showFeedback(ok ? { kind: "copied" } : { kind: "failed" });
    } catch {
      showFeedback({ kind: "failed" });
    }
  };

  const label =
    feedback.kind === "copied"
      ? SHARE_COPIED
      : feedback.kind === "failed"
        ? SHARE_FAILED
        : SHARE_BUTTON_LABEL;

  return (
    <button
      type="button"
      className={`share-button${feedback.kind !== "none" ? " share-button--feedback" : ""}`}
      onClick={handleShare}
      aria-label={SHARE_BUTTON_ARIA}
    >
      {/* Inline SVG so we don't pull in an icon font. Mirrored under RTL via
          dir="ltr" on the wrapper so the arrow points away from the text in
          both directions. */}
      <span className="share-button__icon" aria-hidden="true" dir="ltr">
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
          <line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
        </svg>
      </span>
      <span className="share-button__label">{label}</span>
    </button>
  );
}
