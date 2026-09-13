"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { ChevronLeft } from "@/components/ui/icons";
import { cn } from "@/lib/utils";

import { ActionButton } from "./action-button";

type FormBackActionProps = {
  label: ReactNode;
  href?: string;
  onClick?: () => void;
  className?: string;
};

const backActionClassName =
  "group/back border-0 bg-transparent !px-0 text-[12px] font-semibold transition-none hover:bg-transparent hover:text-muted-foreground";

function BackActionContent({ label }: { label: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <ChevronLeft
        aria-hidden="true"
        className="size-4 transition-colors duration-150 group-hover/back:text-foreground"
        strokeWidth={2}
      />
      <span className="transition-colors duration-150 group-hover/back:text-foreground">
        {label}
      </span>
    </span>
  );
}

export function FormBackAction({
  label,
  href,
  onClick,
  className,
}: FormBackActionProps) {
  const buttonClassName = cn(backActionClassName, className);

  if (href) {
    return (
      <ActionButton
        asChild
        variant="ghost"
        size="sm"
        className={buttonClassName}
      >
        <Link href={href}>
          <BackActionContent label={label} />
        </Link>
      </ActionButton>
    );
  }

  return (
    <ActionButton
      type="button"
      variant="ghost"
      size="sm"
      className={buttonClassName}
      onClick={onClick}
    >
      <BackActionContent label={label} />
    </ActionButton>
  );
}
