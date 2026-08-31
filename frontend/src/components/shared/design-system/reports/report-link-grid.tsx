import Link from "next/link";
import { ArrowUpRight } from "@/components/ui/icons";

export function ReportLinkGrid({
  items,
}: {
  items: Array<{ href: string; title: string }>;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="group surface-hairline rounded-xl bg-card p-5 transition-colors hover:bg-muted/50"
        >
          <p className="text-sm font-semibold text-foreground">{item.title}</p>
          <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-primary">
            Buka halaman
            <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
        </Link>
      ))}
    </section>
  );
}
