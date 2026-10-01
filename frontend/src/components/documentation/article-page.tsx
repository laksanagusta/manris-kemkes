"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlignLeft, ArrowLeft, ArrowRight, ChevronDown } from "@/components/shared/icons";
import { documentationHref, documentationItems } from "@/lib/documentation-navigation";
import { cn } from "@/lib/utils";
import { ArticleContent, type DocumentationArticle } from "./article-content";

function SectionIndex({ article, active }: { article: DocumentationArticle; active: string }) {
  return (
    <nav aria-label="Bagian artikel" className="space-y-1 border-l border-border">
      {article.sections.map((section) => (
        <a key={section.id} href={`#${section.id}`} aria-current={active === section.id ? "location" : undefined}
          className={cn("-ml-px flex min-h-10 items-center border-l-2 py-2 pl-4 pr-2 text-sm leading-5 outline-hidden transition-colors duration-150 focus-visible:ring-2 focus-visible:ring-ring", active === section.id ? "border-foreground font-medium text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{section.title}</a>
      ))}
    </nav>
  );
}

export function DocumentationArticlePage({ article }: { article: DocumentationArticle }) {
  const [active, setActive] = useState(article.sections[0]?.id ?? "");
  const [mobileIndexOpen, setMobileIndexOpen] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      const headings = article.sections.map((section) => document.getElementById(section.id)).filter((element): element is HTMLElement => Boolean(element));
      const current = [...headings].reverse().find((heading) => heading.getBoundingClientRect().top <= 140) ?? headings[0];
      const atBottom = window.scrollY > 0 && window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4;
      setActive((atBottom ? headings.at(-1) : current)?.id ?? "");
      frame = 0;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => { cancelAnimationFrame(frame); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); };
  }, [article]);

  const index = documentationItems.findIndex((item) => item.slug === article.slug);
  const previous = documentationItems[index - 1];
  const next = documentationItems[index + 1];

  return (
    <div className="mx-auto grid w-full max-w-[80rem] gap-12 px-5 py-10 sm:px-8 md:py-16 lg:px-12 xl:grid-cols-[minmax(0,48rem)_13rem] xl:gap-16 xl:py-24 2xl:gap-24">
      <div className="min-w-0">
        <details open={mobileIndexOpen} onToggle={(event) => setMobileIndexOpen(event.currentTarget.open)} className="mb-8 border-b border-border pb-5 xl:hidden">
          <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 text-sm text-muted-foreground [&::-webkit-details-marker]:hidden"><AlignLeft aria-hidden="true" className="size-4" strokeWidth={1.5} />Di halaman ini<ChevronDown aria-hidden="true" className={cn("ml-auto size-4 transition-transform duration-150 motion-reduce:transition-none", mobileIndexOpen && "rotate-180")} /></summary>
          <div className="pt-3" onClick={(event) => { if ((event.target as HTMLElement).closest("a")) setMobileIndexOpen(false); }}><SectionIndex article={article} active={active} /></div>
        </details>
        <ArticleContent article={article} />
        <nav aria-label="Artikel sebelumnya dan berikutnya" className="mt-16 grid grid-cols-2 gap-6 border-t border-border pt-6 text-sm">
          <div>{previous && <Link href={documentationHref(previous.slug)} className="group flex min-h-11 items-center gap-3 rounded-md outline-hidden focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /><span><span className="block text-xs text-tertiary-foreground">Sebelumnya</span><span className="group-hover:underline underline-offset-4">{previous.title}</span></span></Link>}</div>
          <div>{next && <Link href={documentationHref(next.slug)} className="group flex min-h-11 items-center justify-end gap-3 rounded-md text-right outline-hidden focus-visible:ring-2 focus-visible:ring-ring"><span><span className="block text-xs text-tertiary-foreground">Berikutnya</span><span className="group-hover:underline underline-offset-4">{next.title}</span></span><ArrowRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /></Link>}</div>
        </nav>
      </div>
      <aside className="hidden xl:block">
        <div className="sticky top-10 space-y-4"><p className="flex items-center gap-2 text-sm text-muted-foreground"><AlignLeft aria-hidden="true" className="size-4" strokeWidth={1.5} />Di halaman ini</p><SectionIndex article={article} active={active} /></div>
      </aside>
    </div>
  );
}
