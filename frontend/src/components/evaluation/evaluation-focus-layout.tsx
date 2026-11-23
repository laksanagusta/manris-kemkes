"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, ChevronDown } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./evaluation-focus-layout.module.css";

export type EvaluationStep = {
  id: string;
  label: string;
  title: string;
  progress?: string;
};

export function EvaluationFocusLayout({
  steps, activeIndex, onStepChange, status, organization, answered, total, details, children,
}: {
  steps: EvaluationStep[];
  activeIndex: number;
  onStepChange: (index: number) => void;
  status: ReactNode;
  organization: string;
  answered: number;
  total: number;
  details: ReactNode;
  children: ReactNode;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const top = useRef<HTMLElement>(null);
  const stepNav = useRef<HTMLDivElement>(null);
  const pendingStep = useRef<number | null>(null);
  const [motion, setMotion] = useState<{ index: number; direction: "forward" | "back" } | null>(null);
  const [indicator, setIndicator] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const step = steps[activeIndex];

  function goTo(index: number, animate: boolean) {
    if (index === activeIndex || !steps[index]) return;
    pendingStep.current = index;
    setMotion(animate ? { index, direction: index > activeIndex ? "forward" : "back" } : null);
    onStepChange(index);
  }

  useLayoutEffect(() => {
    if (pendingStep.current !== activeIndex) return;
    pendingStep.current = null;
    top.current?.scrollIntoView({ block: "start", behavior: "instant" });
    heading.current?.focus({ preventScroll: true });
  }, [activeIndex]);

  useLayoutEffect(() => {
    const nav = stepNav.current;
    const active = nav?.querySelector<HTMLButtonElement>('[aria-current="step"]');
    if (!nav || !active) return;

    function measure(button: HTMLButtonElement) {
      setIndicator({ x: button.offsetLeft, y: button.offsetTop, width: button.offsetWidth, height: button.offsetHeight });
    }

    measure(active);
    const observer = new ResizeObserver(() => measure(active));
    observer.observe(nav);
    nav.querySelectorAll("button").forEach((button) => observer.observe(button));
    return () => observer.disconnect();
  }, [activeIndex, step?.id]);

  if (!step) return null;

  return (
    <section ref={top} aria-label="Pengisian evaluasi" className="min-w-0 scroll-mt-4 space-y-5">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        {status}
        <span className="min-w-0 wrap-anywhere text-secondary-foreground">{organization}</span>
        {total > 0 && <span aria-live="polite" className="tabular-nums text-muted-foreground">{answered} dari {total} poin terisi</span>}
      </div>
      <details className="group">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded-sm text-sm text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
          Detail evaluasi
          <ChevronDown aria-hidden="true" className="size-4 group-open:rotate-180" />
        </summary>
        <div className="mt-3 max-w-md border-t border-border pt-2">{details}</div>
      </details>
      <nav aria-label="Bagian evaluasi">
        <div ref={stepNav} className="relative isolate border-b border-border pb-2">
          {indicator && (
            <span
              aria-hidden="true"
              className={styles.indicator}
              style={{ transform: `translate(${indicator.x}px, ${indicator.y}px)`, width: indicator.width, height: indicator.height }}
            />
          )}
          <ol className="flex flex-wrap gap-1">
            {steps.map((entry, index) => (
              <li key={entry.id} className="min-w-0 max-w-full">
                <button type="button" aria-current={index === activeIndex ? "step" : undefined}
                  onClick={(event) => goTo(index, event.detail > 0)}
                  className={cn("relative flex min-h-11 min-w-0 items-center gap-1.5 rounded-(--control-radius) px-3 py-2 text-start text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:px-3.5",
                    index === activeIndex && "text-foreground", index === activeIndex && !indicator && "bg-muted")}>
                  <span className="min-w-0 wrap-anywhere">{entry.label}</span>
                  {entry.progress && <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{entry.progress}</span>}
                </button>
              </li>
            ))}
          </ol>
        </div>
      </nav>
      <div key={step.id} data-evaluation-step={step.id} data-direction={motion?.index === activeIndex ? motion.direction : undefined} className={styles.panel}>
        <div className="space-y-6 rounded-(--surface-radius) bg-card p-4 shadow-(--surface-shadow-low) sm:p-6">
          <h2 ref={heading} tabIndex={-1} className="max-w-prose text-base font-semibold text-foreground focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-ring">{step.title}</h2>
          {children}
        </div>
      </div>
      {steps.length > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          {activeIndex > 0 ? (
            <Button type="button" variant="outline" onClick={(event) => goTo(activeIndex - 1, event.detail > 0)}>
              <ChevronLeft aria-hidden="true" /> Sebelumnya
            </Button>
          ) : null}
          {activeIndex < steps.length - 1 && (
            <Button type="button" variant="outline" className="ms-auto" onClick={(event) => goTo(activeIndex + 1, event.detail > 0)}>
              Berikutnya <ChevronRight aria-hidden="true" />
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
