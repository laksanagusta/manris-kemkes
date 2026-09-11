"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";

export const PAGE_HEADER_ACTION_SLOT_ID = "app-header-actions";

export function PageHeaderActionsPortal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setTarget(document.getElementById(PAGE_HEADER_ACTION_SLOT_ID));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!target) {
    return <div className="flex flex-wrap items-center gap-2">{children}</div>;
  }

  return createPortal(children, target);
}
