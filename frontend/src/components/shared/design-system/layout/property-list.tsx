import type { ReactNode } from "react";
import { Building2, Calendar, CircleDot, Clock, FileText, Info, Layers3, Tag, User } from "@/components/shared/icons";
import { cn } from "@/lib/utils";

export function PropertyList({ children, className }: { children: ReactNode; className?: string }) {
  return <dl data-property-list="" className={cn("mt-3 space-y-3 text-sm", className)}>{children}</dl>;
}

export function PropertyLabel({ children }: { children: string }) {
  const label = children.toLowerCase();
  const Icon = /status/.test(label) ? CircleDot
    : /periode|tanggal|pada/.test(label) ? Calendar
    : /diperbarui|waktu/.test(label) ? Clock
    : /kode/.test(label) ? FileText
    : /versi/.test(label) ? Layers3
    : /organisasi|unit/.test(label) ? Building2
    : /oleh|pemilik|penanggung/.test(label) ? User
    : /kategori|tag/.test(label) ? Tag
    : Info;
  return <dt className="flex min-w-0 items-start gap-2 text-sm text-muted-foreground"><Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" /><span className="min-w-0 break-words">{children}</span></dt>;
}
