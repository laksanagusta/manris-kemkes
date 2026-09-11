"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export type DialogActionItem = {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  tone?: "neutral" | "danger";
  disabled?: boolean;
  onSelect: () => void;
};

export function DialogActionList({
  items,
  className,
}: {
  items: ReadonlyArray<DialogActionItem>;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-52 rounded-[12px] bg-popover p-1 border-shadow",
        className,
      )}
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          disabled={item.disabled}
          onClick={item.onSelect}
          className={cn(
            "flex h-8 w-full items-center gap-2 rounded-lg px-2 py-0 text-left text-sm disabled:opacity-50",
            item.tone === "danger" ? "text-destructive" : "text-foreground",
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
