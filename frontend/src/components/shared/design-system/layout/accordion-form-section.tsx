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
      className="scroll-mt-28"
    >
      <AccordionTrigger>
        <p className="text-[10px] font-mono font-semibold uppercase tracking-[0.15em] text-muted-foreground">
          {title}
        </p>
      </AccordionTrigger>
      <AccordionContent className="flex flex-col gap-5">
        {description ? (
          <p className="text-xs leading-relaxed text-secondary-foreground">
            {description}
          </p>
        ) : null}
        {children}
      </AccordionContent>
    </AccordionItem>
  );
}
