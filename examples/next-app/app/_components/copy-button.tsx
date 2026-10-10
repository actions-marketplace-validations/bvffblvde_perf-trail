"use client";

import { useState } from "react";

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="copy"
      data-copied={copied || undefined}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
    >
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        {copied ? (
          <path d="M3 8.5l3 3 7-7" />
        ) : (
          <>
            <rect x="5" y="5" width="8.5" height="8.5" rx="1.5" />
            <path d="M3 10.5V3.5A1.5 1.5 0 0 1 4.5 2h6.5" />
          </>
        )}
      </svg>
      <span>{copied ? "Copied" : "Copy"}</span>
    </button>
  );
}
