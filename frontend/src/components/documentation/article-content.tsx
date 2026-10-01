import Image from "next/image";
import type { ReactNode } from "react";
import { ArrowDown, ArrowRight, Info } from "@/components/shared/icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export type DocumentationSection = {
  id: string;
  title: string;
  paragraphs?: string[];
  steps?: { title: string; detail: string }[];
  fields?: { name: string; description: string }[];
  diagram?: { title: string; detail: string }[];
  note?: string;
  image?: { src: string; alt: string; caption: string; width: number; height: number };
};

export type DocumentationArticle = {
  slug: string;
  title: string;
  description: string;
  category: string;
  access: string;
  sections: DocumentationSection[];
};

export function ArticleContent({ article }: { article: DocumentationArticle }) {
  return (
    <article aria-labelledby="article-title" className="min-w-0 text-base leading-[1.6] text-pretty">
      <header className="mb-12 space-y-4">
        <p className="text-xs font-medium tracking-wide text-tertiary-foreground">{article.category}</p>
        <h1 id="article-title" className="max-w-[24ch] text-[32px] leading-[1.1] font-semibold tracking-[-0.035em]">{article.title}</h1>
        <p className="max-w-[68ch] text-base leading-[1.6] text-muted-foreground">{article.description}</p>
      </header>
      <aside aria-label="Akses dokumentasi ini" className="mb-10 flex gap-3 border-l-2 border-border pl-4 text-sm leading-[1.5]">
        <span className="shrink-0 font-medium text-foreground">Akses</span>
        <p className="max-w-[72ch] text-muted-foreground">{article.access}</p>
      </aside>
      <div className="space-y-12">
        {article.sections.map((section) => (
          <section key={section.id} id={section.id} aria-labelledby={`${section.id}-title`} className="scroll-mt-8 space-y-5">
            <h2 id={`${section.id}-title`} className="text-xl leading-[1.2] font-semibold tracking-tight">{section.title}</h2>
            {section.paragraphs?.map((paragraph) => <p key={paragraph} className="max-w-[72ch] text-muted-foreground">{paragraph}</p>)}
            {section.image && (
              <ScreenshotFrame alt={section.image.alt} caption={section.image.caption}>
                <a href={section.image.src} target="_blank" rel="noreferrer" aria-label={`Buka screenshot: ${section.image.alt}`}
                  className={`block overflow-hidden rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-ring ${section.image.height > section.image.width ? "w-fit" : "w-full"}`}>
                  <Image src={section.image.src} alt={section.image.alt} width={section.image.width} height={section.image.height}
                    sizes="(max-width: 767px) 100vw, (max-width: 1279px) 75vw, 768px"
                    className={section.image.height > section.image.width
                      ? "block h-auto max-h-[36rem] w-auto max-w-full object-contain"
                      : "block h-auto max-h-[34rem] w-full object-contain"} />
                </a>
              </ScreenshotFrame>
            )}
            {section.diagram && (
              <ol aria-label="Alur proses" className="flex flex-col gap-3 rounded-xl bg-sidebar p-4 sm:flex-row">
                {section.diagram.map((node, index) => (
                  <li key={node.title} className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="min-w-0 flex-1">
                      <span className="text-xs tabular-nums text-tertiary-foreground">{String(index + 1).padStart(2, "0")}</span>
                      <p className="text-sm leading-[1.4] font-medium">{node.title}</p>
                      <p className="mt-1 text-xs leading-[1.5] text-muted-foreground">{node.detail}</p>
                    </div>
                    {index < section.diagram!.length - 1 && <><ArrowRight aria-hidden="true" className="hidden size-4 shrink-0 text-tertiary-foreground sm:block" strokeWidth={1.5} /><ArrowDown aria-hidden="true" className="size-4 shrink-0 text-tertiary-foreground sm:hidden" strokeWidth={1.5} /></>}
                  </li>
                ))}
              </ol>
            )}
            {section.steps && (
              <ol className="space-y-6">
                {section.steps.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span aria-hidden="true" className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-sidebar text-xs font-medium tabular-nums">{index + 1}</span>
                    <div className="min-w-0 space-y-1">
                      <h3 className="text-base leading-[1.4] font-medium">{step.title}</h3>
                      <p className="max-w-[72ch] text-muted-foreground">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            {section.fields && (
              <Table>
                <TableHeader><TableRow><TableHead>Kolom / istilah</TableHead><TableHead>Keterangan</TableHead></TableRow></TableHeader>
                <TableBody>{section.fields.map((field) => <TableRow key={field.name}><TableCell className="w-1/3 align-top whitespace-normal"><span className="font-medium">{field.name}</span></TableCell><TableCell className="align-top whitespace-normal"><span className="text-muted-foreground">{field.description}</span></TableCell></TableRow>)}</TableBody>
              </Table>
            )}
            {section.note && (
              <aside className="flex gap-3 border-l-2 border-border pl-4">
                <Info aria-hidden="true" strokeWidth={1.5} className="mt-1 size-4 shrink-0 text-muted-foreground" />
                <p className="max-w-[72ch] text-sm leading-[1.5] text-muted-foreground">{section.note}</p>
              </aside>
            )}
          </section>
        ))}
      </div>
    </article>
  );
}

function ScreenshotFrame({ alt, caption, children }: { alt: string; caption: string; children: ReactNode }) {
  return (
    <figure className="space-y-3">
      <div role="group" aria-label={alt} className="relative isolate overflow-hidden rounded-2xl border border-border bg-sunken">
        <Image src="/documentation/manris-landscape.jpg" alt="" aria-hidden="true" fill sizes="(max-width: 767px) 100vw, (max-width: 1279px) 75vw, 768px" className="object-cover" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-br from-black/5 via-black/10 to-black/25" />
        <div className="relative grid min-h-[17rem] place-items-center p-3 sm:min-h-[20rem] sm:p-7">
          <div className="flex w-full max-w-3xl justify-center overflow-hidden rounded-xl border border-white/80 bg-white shadow-[0_24px_64px_-28px_rgb(0_0_0/0.65)]">
            {children}
          </div>
        </div>
      </div>
      <figcaption className="max-w-[72ch] text-xs leading-[1.5] text-tertiary-foreground">{caption}</figcaption>
    </figure>
  );
}
