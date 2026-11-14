"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Check } from "@/components/shared/icons";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { AnnualCandidate, AnnualMember } from "@/lib/api/upr-workflow";
import {
  annualCandidateSource,
  filterAnnualCandidates,
  type AnnualBatchResult,
} from "@/lib/annual-profile";
import { WorkflowError, workflowError } from "./workflow-ui";

export function AnnualCandidateDialog({
  year,
  candidates,
  members,
  pending,
  error,
  retry,
  close,
  restoreFocus,
  createHref,
  onAdd,
}: {
  year: number;
  candidates: AnnualCandidate[];
  members: AnnualMember[];
  pending: boolean;
  error: string;
  retry: () => void;
  close: () => void;
  restoreFocus: () => void;
  createHref: string;
  onAdd: (
    candidates: AnnualCandidate[],
    date: string,
    reason: string,
  ) => Promise<AnnualBatchResult>;
}) {
  const searchInput = useRef<HTMLInputElement>(null);
  const [source, setSource] = useState("active");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);
  const [saveError, setSaveError] = useState("");
  const available = filterAnnualCandidates(
    candidates,
    members,
    year,
    "active",
  ).filter((item) => !completed.includes(item.id));
  const fromPriorProfile = source === "prior";
  const sourceItems = fromPriorProfile
    ? filterAnnualCandidates(available, [], year, "prior")
    : available;
  const query = search.trim().toLocaleLowerCase("id");
  const choices = sourceItems.filter((item) =>
    `${item.code} ${item.title}`.toLocaleLowerCase("id").includes(query),
  );
  const selectedIds = new Set(selected);
  const picked = available.filter((item) => selectedIds.has(item.id));

  function toggle(id: string) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }

  async function submit() {
    if (!picked.length || pending) return;
    setSaveError("");
    try {
      const result = await onAdd(picked, "", "");
      setCompleted((current) => [...current, ...result.added]);
      setSelected((current) =>
        current.filter((id) => !result.added.includes(id)),
      );
      if (result.error)
        setSaveError(
          `${result.added.length ? `${result.added.length} risiko berhasil ditambahkan. ` : ""}${result.error} Pilihan yang belum tersimpan tetap tersedia untuk dicoba lagi.`,
        );
      else close();
    } catch (cause) {
      setSaveError(workflowError(cause));
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) close();
      }}
    >
      <DialogContent
        className="flex max-w-[640px] flex-col gap-0 p-0"
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          searchInput.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreFocus();
        }}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Tambah risiko ke profil {year}</DialogTitle>
          <DialogDescription>
            Cari dan pilih risiko aktif untuk ditambahkan ke profil.
          </DialogDescription>
        </DialogHeader>
        <Tabs value={source} onValueChange={setSource} className="gap-0">
          <TabsList
            aria-label="Sumber risiko"
            variant="line"
            className="mx-4 mt-2 p-0"
          >
            <TabsTrigger value="active" disabled={pending}>
              Risiko aktif
            </TabsTrigger>
            <TabsTrigger value="prior" disabled={pending}>
              Dari profil sebelumnya
            </TabsTrigger>
          </TabsList>
          <TabsContent value={source}>
            <Command
              shouldFilter={false}
              loop
              className="shrink-0 p-2"
            >
              <CommandInput
                ref={searchInput}
                aria-label="Cari risiko untuk ditambahkan"
                placeholder="Cari kode atau nama risiko…"
                value={search}
                onValueChange={setSearch}
                disabled={pending}
                wrapperClassName="px-2 pt-1"
                className="max-sm:text-base"
              />
              <CommandList
                className="max-h-[min(42dvh,20rem)] px-2"
                aria-label="Hasil pencarian risiko"
              >
                {!error &&
                  choices.map((candidate) => {
                    const checked = selected.includes(candidate.id);
                    return (
                      <CommandItem
                        key={candidate.id}
                        value={candidate.id}
                        data-checked={checked}
                        aria-label={`${candidate.code} ${candidate.title}, ${annualCandidateSource(candidate, year)}, skor ${candidate.score}${checked ? ", sudah dipilih" : ""}`}
                        disabled={pending}
                        onSelect={() => toggle(candidate.id)}
                        className="mb-1 min-h-16 items-start gap-3 rounded-lg px-3 py-2.5 last:mb-0 data-selected:bg-transparent! data-selected:text-foreground data-selected:ring-1 data-selected:ring-inset data-selected:ring-ring/40 [&>svg:last-child]:hidden"
                      >
                        <span
                          aria-hidden="true"
                          className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-[5px] border transition-colors ${
                            checked
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-input bg-background"
                          }`}
                        >
                          {checked && <Check className="size-3.5" />}
                        </span>
                        <span className="min-w-0 flex-1 space-y-1 whitespace-normal">
                          <span className="block break-words font-medium leading-5">
                            {candidate.title}
                          </span>
                          <span className="block break-words text-xs leading-4 text-muted-foreground">
                            {candidate.code} ·{" "}
                            {annualCandidateSource(candidate, year)} · Skor{" "}
                            {candidate.score}
                          </span>
                        </span>
                      </CommandItem>
                    );
                  })}
                {!error && !choices.length && (
                  <p
                    className="px-3 py-8 text-center text-sm text-muted-foreground"
                    role="status"
                  >
                    {search.trim()
                      ? "Tidak ada risiko yang cocok dengan pencarian."
                      : fromPriorProfile
                        ? `Tidak ada risiko yang bisa ditambahkan dari profil final ${year - 1}. Cek tab Risiko aktif.`
                        : "Belum ada risiko aktif yang bisa ditambahkan."}
                  </p>
                )}
              </CommandList>
            </Command>
          </TabsContent>
        </Tabs>
        {(error || saveError) && (
          <div className="space-y-3 px-4 py-3">
            {error && <WorkflowError message={error} retry={retry} />}
            {saveError && <WorkflowError message={saveError} />}
          </div>
        )}
        <DialogFooter className="border-t px-4 py-3 sm:items-center">
          <span
            role="status"
            className="text-sm text-muted-foreground sm:mr-auto"
          >
            {picked.length} risiko dipilih
            {completed.length > 0 && ` · ${completed.length} ditambahkan`}
          </span>
          {!pending && (
            <Button variant="ghost" asChild>
              <Link href={createHref}>Buat risiko baru</Link>
            </Button>
          )}
          <Button variant="outline" disabled={pending} onClick={close}>
            Batal
          </Button>
          <Button
            disabled={pending || !picked.length || Boolean(error)}
            onClick={() => void submit()}
          >
            {pending
              ? "Menambahkan…"
              : picked.length
                ? `Tambahkan ${picked.length} risiko`
                : "Tambahkan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
