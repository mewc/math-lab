"use client";

import { useState, type ReactNode } from "react";

// Numbered annotation. Renders a clickable superscript marker inline; the note
// body expands in place, directly where the text it annotates lives. Numbers
// are passed explicitly so they are deterministic under SSR and StrictMode.

export function Note({ n, children }: { n: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="note-ref"
        data-open={open}
        aria-expanded={open}
        title={open ? "Hide annotation" : "Show annotation"}
        onClick={() => setOpen((o) => !o)}
      >
        {n}
      </button>
      {open && (
        <span className="note-body" style={{ display: "block" }}>
          <span className="note-tag">Note {n}</span>
          {children}
        </span>
      )}
    </>
  );
}
