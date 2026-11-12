"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Copy } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";

export function CollectionCode({ code, href }: {
  code?: string | number | null;
  href?: string;
}) {
  const value = code == null ? "" : String(code);
  if (!value.trim() || value === "-" || value === "—") return "—";

  return (
    <span className="inline-flex w-max items-center gap-1.5 whitespace-nowrap">
      {href ? (
        <Link href={href} title={value} className="shrink-0 rounded-sm font-medium whitespace-nowrap no-underline hover:text-primary focus-visible:outline-2 focus-visible:outline-ring">
          {value}
        </Link>
      ) : (
        <span title={value} className="shrink-0 whitespace-nowrap">{value}</span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label={`Salin ${value}`}
        title="Salin kode"
        onClick={async (event) => {
          event.stopPropagation();
          try {
            await navigator.clipboard.writeText(value);
            toast.success("Kode disalin.");
          } catch {
            toast.error("Kode tidak dapat disalin.");
          }
        }}
      >
        <Copy aria-hidden="true" />
      </Button>
    </span>
  );
}
