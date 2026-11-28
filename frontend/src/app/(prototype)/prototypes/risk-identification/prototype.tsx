"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { VariantPicker } from "@/app/(app)/prototypes/_components/variant-picker";
import { ManriskMark } from "@/components/manrisk-mark";
import { FormContainer, FormGroup } from "@/components/shared/design-system/layout/form-container";
import { RiskCreationContext, RiskFormReadiness } from "@/components/shared/design-system/domain/risk-creation-guidance";
import { Bingkai } from "./bingkai";
import { sample, useIdentificationFields } from "./fields";
import { Inset } from "./inset";
import { Terbuka } from "./terbuka";

const variants = [Bingkai, Inset, Terbuka];
const names = ["Bingkai", "Inset", "Terbuka"];

export function IdentificationPrototype({ initialVariant }: { initialVariant: number }) {
  const [current, setCurrent] = useState(initialVariant);
  const [draft, setDraft] = useState(sample);
  const fields = useIdentificationFields(draft, (key, value) => setDraft(previous => ({ ...previous, [key]: value })));
  const Variant = variants[current];
  const progress = Math.round([
    draft.title.trim(), draft.category, draft.source, draft.control,
    draft.causes.length, draft.impacts.length,
  ].filter(Boolean).length / 6 * 100);

  function select(index: number) {
    setCurrent(index);
    const url = new URL(location.href);
    url.searchParams.set("v", String(index + 1));
    history.replaceState(null, "", url);
  }

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const target = event.target;
      if (target instanceof HTMLElement &&
        (target.isContentEditable || target.closest("input, textarea, select, [role=tablist], [role=menu], [role=dialog]"))) return;

      if (/^[1-3]$/.test(event.key)) select(Number(event.key) - 1);
      else if (event.key === "ArrowRight") select((current + 1) % variants.length);
      else if (event.key === "ArrowLeft") select((current - 1 + variants.length) % variants.length);
      else return;
      event.preventDefault();
    }

    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [current]);

  return (
    <div className="grid min-h-dvh bg-(--app-shell-canvas) md:grid-cols-[var(--app-sidebar-width)_minmax(0,1fr)]">
      <aside className="hidden px-5 py-6 md:block">
        <div className="flex items-center gap-2 text-xl font-semibold lowercase"><ManriskMark size={20} />Manrisk</div>
        <div className="mt-8 rounded-lg bg-sidebar-accent px-3 py-2 text-sm text-sidebar-accent-foreground">Register Risiko</div>
      </aside>
      <main className="min-w-0 bg-workspace md:m-2 md:rounded-(--surface-radius) md:shadow-(--surface-shadow-low)">
        <header className="flex min-h-14 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2 md:px-5">
          <h1 className="text-base"><Link href="/risk/register" className="text-muted-foreground hover:underline">Register Risiko</Link><span aria-hidden="true" className="mx-2 text-muted-foreground">/</span>Tambah Risiko</h1>
          <p className="text-xs text-muted-foreground">Prototipe · Data simulasi</p>
        </header>
        <div className="grid items-start gap-6 px-4 pt-5 pb-24 md:px-5 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="order-2 min-w-0 space-y-4 xl:order-1">
            <section id="identifikasi" aria-label="Identifikasi Risiko" className="scroll-mt-5">
              <Variant key={current}>
                <FormGroup className="space-y-5">
                  {fields.title}
                  {fields.description}
                  {fields.owner}
                  {fields.category}
                </FormGroup>
                <FormGroup className="space-y-5">
                  {fields.causes}
                  <div className="grid gap-5 md:grid-cols-2">
                    {fields.source}
                    {fields.control}
                  </div>
                  {fields.impacts}
                </FormGroup>
              </Variant>
            </section>
            <FormContainer title="Analisis Risiko" description="Nilai kemungkinan dan dampak risiko.">
              <FormGroup className="text-muted-foreground">Penilaian belum diisi.</FormGroup>
            </FormContainer>
          </div>
          <aside className="order-1 space-y-4 xl:sticky xl:top-6 xl:order-2">
            <RiskCreationContext saveMessage="Perubahan hanya tersimpan selama pratinjau terbuka." />
            <RiskFormReadiness sections={[{ id: "identifikasi", title: "Identifikasi Risiko", done: progress === 100, progress, hint: "Lengkapi kolom wajib untuk identifikasi." }]} onNavigate={id => document.getElementById(id)?.scrollIntoView({ block: "start" })} />
            <FormContainer title="Properti">
              <FormGroup>
                <dl className="grid gap-3">
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Unit</dt><dd>Tim Distribusi Obat</dd></div>
                  <div className="flex justify-between gap-2"><dt className="text-muted-foreground">Status</dt><dd>Draf</dd></div>
                </dl>
              </FormGroup>
            </FormContainer>
          </aside>
        </div>
        <VariantPicker names={names} current={current} select={select} />
      </main>
    </div>
  );
}
