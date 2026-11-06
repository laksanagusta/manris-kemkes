"use client";
import { Children, isValidElement, useEffect, useRef, type ComponentProps, type ReactNode } from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import styles from "./collection-table-card.module.css";
import { CollectionPagination } from "./collection-pagination";
import { CollectionSortProvider, type CollectionSortControls } from "./collection-sorting";

export function CollectionTableCard({
  children,
  className,
  sorting,
  stickyActions = false,
  ...props
}: {
  children: ReactNode;
  sorting?: CollectionSortControls;
  stickyActions?: boolean;
} & Omit<ComponentProps<typeof Card>, "children">) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!stickyActions) return;
    const viewport = contentRef.current?.querySelector<HTMLElement>('[data-slot="table-container"]');
    const table = viewport?.querySelector("table");
    if (!viewport || !table) return;

    const update = () => {
      const remaining = viewport.scrollWidth - viewport.clientWidth - Math.abs(viewport.scrollLeft);
      viewport.toggleAttribute("data-action-overlap", remaining > 1);
    };

    const observer = new ResizeObserver(update);
    observer.observe(viewport);
    observer.observe(table);
    viewport.addEventListener("scroll", update, { passive: true });
    update();
    return () => {
      observer.disconnect();
      viewport.removeEventListener("scroll", update);
      viewport.removeAttribute("data-action-overlap");
    };
  }, [stickyActions]);

  const items = Children.toArray(children);
  const isPagination = (item: ReactNode) =>
    isValidElement(item) && item.type === CollectionPagination;

  return (
    <CollectionSortProvider controls={sorting}><Card className={cn("gap-0 py-0", styles.tableCard, className)} data-collection-table="" {...props}>
      <CardContent className="min-w-0 p-0">
        <div ref={contentRef} className="min-w-0">
          {items.filter((item) => !isPagination(item))}
        </div>
      </CardContent>
      {items.filter(isPagination)}
    </Card></CollectionSortProvider>
  );
}
