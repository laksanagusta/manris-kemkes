"use client";

import { useState } from "react";
import { Search } from "lucide-react";

import { CollectionSearchField } from "./collection-search-field";

export function ExpandableSearchField({
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  if (open || value) {
    return (
      <CollectionSearchField
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        onBlur={() => {
          if (!value) setOpen(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        autoFocus
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setOpen(true)}
      className="relative flex h-9 w-9 items-center justify-end rounded-md pr-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
      aria-label={ariaLabel}
    >
      <Search className="absolute right-2 size-4" />
    </button>
  );
}
