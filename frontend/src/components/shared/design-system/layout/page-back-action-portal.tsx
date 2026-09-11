"use client";

import { createPortal } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";

export const PAGE_BACK_ACTION_SLOT_ID = "app-header-back-action";

export function PageBackActionPortal({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setTarget(document.getElementById(PAGE_BACK_ACTION_SLOT_ID));
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  if (!target) {
    return <div className="flex items-center">{children}</div>;
  }

  return createPortal(children, target);
}
