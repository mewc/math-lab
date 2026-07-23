"use client";

import { useEffect, useRef, useState } from "react";

// "Share your thoughts"-style modal, tuned for Math Lab: the categories are the
// things this site actually wants from a reader — a new problem/result, a
// correction to a statement or status (accuracy is the whole point here), an
// idea, or a question. When opened from a dossier it takes that problem head-on
// (shown in the header and attached to the payload). Sends to /api/feedback,
// which relays to Slack. GitHub PRs/issues are offered as the durable path.

export const REPO_URL = "https://github.com/mewc/math-lab";

export interface FeedbackProblem {
  title: string;
  slug: string;
}

type Category = "submit" | "correction" | "idea" | "question";

const CATEGORIES: { id: Category; label: string; glyph: string; hint: string }[] = [
  { id: "submit", label: "Submit", glyph: "🧮", hint: "Propose a problem, or share a result / counterexample." },
  { id: "correction", label: "Correction", glyph: "✏️", hint: "A statement, status, or quantifier looks wrong — set it straight." },
  { id: "idea", label: "Idea", glyph: "💡", hint: "An angle of attack, an instrument, anything worth trying." },
  { id: "question", label: "Question", glyph: "❓", hint: "Ask about a problem, a claim, or the lab itself." },
];

const MAX = 1000;

export default function FeedbackModal({
  open,
  onClose,
  problem,
}: {
  open: boolean;
  onClose: () => void;
  problem?: FeedbackProblem | null;
}) {
  const [category, setCategory] = useState<Category>(problem ? "correction" : "submit");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset + focus each time it opens; default the category to "correction" when
  // a specific problem is in view (most on-topic), else "submit".
  useEffect(() => {
    if (!open) return;
    setCategory(problem ? "correction" : "submit");
    setMessage("");
    setState("idle");
    setError("");
    const t = setTimeout(() => textareaRef.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open, problem]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const activeHint = CATEGORIES.find((c) => c.id === category)?.hint ?? "";

  async function send() {
    const trimmed = message.trim();
    if (trimmed.length < 2) {
      setError("Add a little more detail first.");
      setState("error");
      return;
    }
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          message: trimmed,
          problem: problem ?? null,
          url: typeof window !== "undefined" ? window.location.href : "",
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setState("sent");
      } else {
        setState("error");
        setError(data.error ?? "Something went wrong. Try the GitHub link below.");
      }
    } catch {
      setState("error");
      setError("Network error. Try the GitHub link below.");
    }
  }

  return (
    <div className="fb-overlay" role="presentation" onClick={onClose}>
      <div
        className="fb-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fb-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="fb-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {state === "sent" ? (
          <div className="fb-sent">
            <div className="fb-sent-glyph" aria-hidden>
              ✓
            </div>
            <h2 id="fb-title">Sent — thank you.</h2>
            <p>
              It landed in the lab&apos;s inbox. For anything you&apos;d like tracked in the open,
              a{" "}
              <a href={REPO_URL} target="_blank" rel="noreferrer noopener">
                pull request or issue
              </a>{" "}
              is the durable path.
            </p>
            <div className="fb-actions">
              <button className="fb-btn fb-btn-primary" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="fb-head">
              <h2 id="fb-title">
                <span aria-hidden>💬</span> Share your thoughts
              </h2>
              <p className="fb-sub">
                {problem ? (
                  <>
                    On <strong>{problem.title}</strong> — spotted an error, have a construction, or
                    a better angle? Every note is read.
                  </>
                ) : (
                  <>Submit a problem or result, flag a mistake, or float an idea. Every note is read.</>
                )}
              </p>
            </div>

            <div className="fb-cats" role="tablist" aria-label="Feedback type">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  role="tab"
                  aria-selected={category === c.id}
                  className="fb-cat"
                  data-active={category === c.id}
                  onClick={() => setCategory(c.id)}
                >
                  <span className="fb-cat-glyph" aria-hidden>
                    {c.glyph}
                  </span>
                  {c.label}
                </button>
              ))}
            </div>

            <label className="fb-field">
              <textarea
                ref={textareaRef}
                value={message}
                maxLength={MAX}
                placeholder={activeHint}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
              />
              <span className="fb-count">
                {message.length}/{MAX}
              </span>
            </label>

            {state === "error" && <div className="fb-error">{error}</div>}

            <div className="fb-footer">
              <a className="fb-gh" href={REPO_URL} target="_blank" rel="noreferrer noopener">
                or open a PR / issue on GitHub →
              </a>
              <div className="fb-actions">
                <button className="fb-btn" onClick={onClose}>
                  Cancel
                </button>
                <button
                  className="fb-btn fb-btn-primary"
                  onClick={send}
                  disabled={state === "sending" || message.trim().length < 2}
                >
                  {state === "sending" ? "Sending…" : "Send"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
