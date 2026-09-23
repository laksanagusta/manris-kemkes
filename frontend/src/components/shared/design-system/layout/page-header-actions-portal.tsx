"use client";

import type { ReactNode } from "react";

export const PAGE_HEADER_ACTION_SLOT_ID = "app-header-actions";

export function PageHeaderActionsPortal({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {children}
    </div>
  );
}
