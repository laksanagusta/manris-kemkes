import Link from "next/link";
import { ArrowUpRight } from "@/components/shared/icons";
import { Card, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function ReportLinkGrid({
  items,
}: {
  items: Array<{ href: string; title: string }>;
}) {
  return (
    <section className="grid gap-4 md:grid-cols-2">
      {items.map((item) => (
        <Card key={item.href} className="group transition-colors hover:bg-muted/50">
          <CardHeader><CardTitle>{item.title}</CardTitle></CardHeader>
          <CardFooter>
            <Link href={item.href} className="inline-flex items-center gap-1">
              Buka halaman
              <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </CardFooter>
        </Card>
      ))}
    </section>
  );
}
