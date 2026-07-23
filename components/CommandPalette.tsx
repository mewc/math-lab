"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PROBLEMS, STAGE_LABEL, problemHref, type Problem } from "@/lib/problems";
import { REPO_URL } from "@/components/FeedbackModal";

// ⌘K command palette: one keyboard-driven jump list over the whole registry
// plus the site's nav destinations and actions. Opens on ⌘K / Ctrl+K from
// anywhere; the collapsed sidebar's search button opens it too. Hand-rolled in
// the app's own CSS to keep the zero-dependency, dark-serif aesthetic intact.

type Group = "Navigate" | "Problems" | "Actions";

interface Cmd {
  id: string;
  label: string;
  hint?: string; // secondary text shown dimmed after the label
  badge?: string; // small right-aligned tag (e.g. stage)
  group: Group;
  keywords: string;
  run: () => void;
}

function tokens(q: string): string[] {
  return q.toLowerCase().split(/\s+/).filter(Boolean);
}

function problemKeywords(p: Problem): string {
  return `${p.title} ${(p.aka ?? []).join(" ")} ${p.tags.join(" ")} ${p.category} ${p.stage}`.toLowerCase();
}

export default function CommandPalette({
  open,
  setOpen,
  onOpenFeedback,
}: {
  open: boolean;
  setOpen: (v: boolean) => void;
  onOpenFeedback: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, [setOpen]);

  const go = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  // The full command set — nav destinations, every problem, then actions.
  const commands = useMemo<Cmd[]>(() => {
    const nav: Cmd[] = [
      { id: "nav-home", label: "Home", hint: "the index", group: "Navigate", keywords: "home index start search", run: () => go("/") },
      {
        id: "nav-fields",
        label: "Problems by field",
        hint: "browse categories",
        group: "Navigate",
        keywords: "problems fields categories browse index",
        run: () => go("/problems"),
      },
      {
        id: "nav-collatz-log",
        label: "Collatz attack log",
        hint: "live campaign notes",
        group: "Navigate",
        keywords: "collatz attack log campaign notes 3n+1 hailstone",
        run: () => go("/p/collatz/attack-log"),
      },
    ];

    const problems: Cmd[] = PROBLEMS.map((p) => ({
      id: `p-${p.slug}`,
      label: p.title,
      hint: p.category,
      badge: STAGE_LABEL[p.stage],
      group: "Problems",
      keywords: problemKeywords(p),
      run: () => go(problemHref(p)),
    }));

    const actions: Cmd[] = [
      {
        id: "act-feedback",
        label: "Submit / feedback",
        hint: "propose, correct, ask",
        group: "Actions",
        keywords: "submit feedback correction idea question propose share result",
        run: () => {
          close();
          onOpenFeedback();
        },
      },
      {
        id: "act-github",
        label: "GitHub — PRs welcome",
        hint: "open repository",
        group: "Actions",
        keywords: "github repo source code pull request open source",
        run: () => {
          close();
          window.open(REPO_URL, "_blank", "noopener,noreferrer");
        },
      },
    ];

    return [...nav, ...problems, ...actions];
  }, [go, close, onOpenFeedback]);

  const results = useMemo(() => {
    const ts = tokens(query);
    if (ts.length === 0) return commands;
    return commands.filter((c) => {
      const hay = `${c.label} ${c.hint ?? ""} ${c.keywords}`.toLowerCase();
      return ts.every((t) => hay.includes(t));
    });
  }, [commands, query]);

  // Keep the active index in range as the filtered set changes.
  useEffect(() => {
    setActive((a) => (a >= results.length ? Math.max(0, results.length - 1) : a));
  }, [results.length]);

  // Global ⌘K / Ctrl+K to toggle the palette open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen(!open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // Focus the input when opening; reset transient state.
  useEffect(() => {
    if (open) {
      setActive(0);
      // focus after the element mounts
      const id = requestAnimationFrame(() => inputRef.current?.focus());
      return () => cancelAnimationFrame(id);
    }
  }, [open]);

  // Scroll the active row into view.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: "nearest" });
  }, [active, results.length]);

  if (!open) return null;

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (results.length ? (a + 1) % results.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (results.length ? (a - 1 + results.length) % results.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      results[active]?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  let lastGroup: Group | null = null;

  return (
    <div className="cmdk-scrim" onMouseDown={close}>
      <div
        className="cmdk"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="cmdk-search">
          <span className="cmdk-glyph" aria-hidden>
            ⌕
          </span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onInputKey}
            placeholder="Jump to a problem, page, or action…"
            aria-label="Search commands"
          />
          <kbd className="cmdk-esc">esc</kbd>
        </div>

        <div className="cmdk-list" ref={listRef}>
          {results.length === 0 ? (
            <div className="cmdk-empty">No matches for &ldquo;{query}&rdquo;.</div>
          ) : (
            results.map((c, i) => {
              const header =
                c.group !== lastGroup ? (
                  <div className="cmdk-group" key={`h-${c.group}`}>
                    {c.group}
                  </div>
                ) : null;
              lastGroup = c.group;
              const isActive = i === active;
              return (
                <div key={c.id}>
                  {header}
                  <button
                    type="button"
                    className="cmdk-row"
                    data-active={isActive}
                    onMouseMove={() => setActive(i)}
                    onClick={() => c.run()}
                  >
                    <span className="cmdk-label">{c.label}</span>
                    {c.hint && <span className="cmdk-hint">{c.hint}</span>}
                    {c.badge && <span className="cmdk-badge">{c.badge}</span>}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="cmdk-foot">
          <span>
            <kbd>↑</kbd>
            <kbd>↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> open
          </span>
          <span>
            <kbd>⌘</kbd>
            <kbd>K</kbd> toggle
          </span>
        </div>
      </div>
    </div>
  );
}
