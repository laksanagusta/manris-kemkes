import Link from "next/link";
import type { ReactNode } from "react";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RiskCategoryIndicator } from "./risk-category-indicator";

export type RiskRegisterCardItem = {
  id: string;
  title: string;
  href?: string;
  code: string;
  score: string;
  level: ReactNode;
  status: ReactNode;
  actions?: ReactNode;
};

export function RiskRegisterCards({ groups }: {
  groups: { category: string; items: RiskRegisterCardItem[] }[];
}) {
  return (
    <div className="space-y-7">
      {groups.map(({ category, items }) => (
        <section key={category} className="space-y-4 border-t border-border pt-5">
          <h2 className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <RiskCategoryIndicator showDot={false} category={category} className="text-section-title tracking-[-0.015em] text-foreground" />
            <span className="text-xs font-normal tabular-nums text-muted-foreground">{items.length} risiko</span>
          </h2>
          <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {items.map((item) => (
              <Card key={item.id} className="min-w-0">
                <CardHeader>
                  <p className="text-xs text-muted-foreground">{item.code}</p>
                  <CardTitle className="wrap-anywhere leading-5">
                    {item.href ? <Link href={item.href} className="rounded-sm no-underline hover:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                      {item.title}
                    </Link> : item.title}
                  </CardTitle>
                  {item.actions ? <CardAction>{item.actions}</CardAction> : null}
                </CardHeader>
                <CardContent className="mt-auto">
                  <dl className="space-y-2 text-xs">
                    <div className="flex flex-wrap items-end justify-between gap-2">
                      <div>
                        <dt className="text-muted-foreground">Skor risiko</dt>
                        <dd className="mt-0.5 text-section-title tabular-nums tracking-[-0.015em]">{item.score}</dd>
                      </div>
                      <div><dt className="sr-only">Level risiko</dt><dd>{item.level}</dd></div>
                    </div>
                    <div className="-mx-(--card-spacing) flex items-center justify-between gap-3 border-t border-border px-(--card-spacing) pt-3">
                      <dt className="text-muted-foreground">Status</dt><dd>{item.status}</dd>
                    </div>
                  </dl>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
