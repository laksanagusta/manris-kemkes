import type { ReactNode } from "react";

import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export function AccordionFormSection({
  value,
  title,
  description,
  children,
}: {
  value: string;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AccordionItem
      value={value}
      className="scroll-mt-28 overflow-hidden rounded-2xl border border-zinc-200/80 bg-card shadow-none transition-all data-[state=open]:border-zinc-200/80"
    >
      <AccordionTrigger className="pointer-events-none cursor-default items-center rounded-none border-0 border-b border-border/60 px-4 py-6 hover:no-underline [&>svg]:hidden">
        <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {title}
        </p>
      </AccordionTrigger>
      <AccordionContent className="space-y-5 px-4 pb-6 pt-10">
        {description ? (
          <p className="text-xs leading-relaxed text-muted-foreground/70">
            {description}
          </p>
        ) : null}
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}
