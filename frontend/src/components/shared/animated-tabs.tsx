"use client";

import * as React from "react";

import {
  Tabs,
  TabsContent,
  TabsList as StockTabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type TabsListProps = React.ComponentProps<typeof StockTabsList>;

function TabsList({ variant = "default", children, ref, ...props }: TabsListProps) {
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [indicatorStyle, setIndicatorStyle] = React.useState<React.CSSProperties>({ opacity: 0 });

  const setRefs = React.useCallback((node: HTMLDivElement | null) => {
    listRef.current = node;
    if (typeof ref === "function") ref(node);
    else if (ref) ref.current = node;
  }, [ref]);

  React.useEffect(() => {
    if (variant === "line") return;
    const listElement = listRef.current;
    if (!listElement) return;

    const syncIndicator = () => {
      const activeTrigger = listElement.querySelector<HTMLElement>('[data-slot="tabs-trigger"][data-state="active"]');
      if (!activeTrigger) {
        setIndicatorStyle((current) => ({ ...current, opacity: 0 }));
        return;
      }
      setIndicatorStyle({
        top: activeTrigger.offsetTop,
        opacity: 1,
        transform: `translateX(${activeTrigger.offsetLeft}px)`,
        height: activeTrigger.offsetHeight,
        width: activeTrigger.offsetWidth,
      });
    };

    syncIndicator();
    const resizeObserver = new ResizeObserver(syncIndicator);
    const mutationObserver = new MutationObserver(syncIndicator);
    resizeObserver.observe(listElement);
    listElement.querySelectorAll('[data-slot="tabs-trigger"]').forEach((child) => resizeObserver.observe(child));
    mutationObserver.observe(listElement, {
      attributes: true,
      attributeFilter: ["data-state"],
      childList: true,
      subtree: true,
    });
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, [variant]);

  return (
    <StockTabsList ref={setRefs} variant={variant} data-app-animated-tabs={variant === "default" ? "" : undefined} {...props}>
      {variant === "default" ? (
        <span aria-hidden="true" data-slot="tabs-active-indicator" style={indicatorStyle} />
      ) : null}
      {children}
    </StockTabsList>
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
