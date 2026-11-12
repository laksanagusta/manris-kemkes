"use client";

import { useRef, useState, type ReactNode } from "react";
import { ArrowLeft, KeyRound, Search, ShieldCheck, SlidersHorizontal, UserRound } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

export type SettingsSection = "account" | "security" | "preferences" | "api-key";
const sections = [
  { id: "preferences" as const, label: "Preferensi", icon: SlidersHorizontal, keywords: "tema tampilan terang gelap sistem" },
  { id: "account" as const, label: "Akun", icon: UserRound, keywords: "profil nama email nip jabatan pangkat password keamanan" },
  { id: "security" as const, label: "Keamanan", icon: ShieldCheck, keywords: "password kata sandi keamanan" },
  { id: "api-key" as const, label: "API key", icon: KeyRound, keywords: "integrasi heatmap peta risiko generate regenerate organisasi" },
];

export function SettingsDialog({ open, onOpenChange, section, onSectionChange, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  children: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const previousFocus = useRef<HTMLElement | null>(null);
  const visibleSections = sections.filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) setSearch(""); onOpenChange(value); }}>
      <DialogContent
        data-settings-workspace=""
        showCloseButton={false}
        className="grid h-dvh max-h-none w-full max-w-none grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0 sm:max-w-none md:grid-cols-[260px_minmax(0,1fr)] md:grid-rows-1"
        onOpenAutoFocus={() => {
          previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        }}
        onCloseAutoFocus={(event) => {
          const target = previousFocus.current?.isConnected && previousFocus.current !== document.body
            ? previousFocus.current
            : document.querySelector<HTMLElement>("[data-settings-return]");
          if (target) {
            event.preventDefault();
            target.focus();
          }
        }}
      >
          <aside className="flex min-h-0 flex-col gap-3 border-b border-border p-3 md:border-r md:border-b-0 md:p-4">
            <DialogClose asChild>
              <Button variant="ghost" className="self-start text-muted-foreground">
                <ArrowLeft data-icon="inline-start" aria-hidden="true" />Kembali ke aplikasi
              </Button>
            </DialogClose>
            <div>
              <InputGroup>
                <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
                <InputGroupInput aria-label="Cari pengaturan" placeholder="Cari pengaturan..." value={search} onChange={(event) => setSearch(event.target.value)} />
              </InputGroup>
            </div>
            <nav aria-label="Menu pengaturan" className="min-h-0 overflow-auto">
              <div className="flex flex-wrap gap-1 md:flex-col">
                {visibleSections.map(({ id, label, icon: Icon }) => (
                  <Button key={id} variant={section === id ? "secondary" : "ghost"} className={section === id ? "justify-start text-primary md:w-full" : "justify-start text-secondary-foreground md:w-full"} aria-current={section === id ? "page" : undefined} onClick={() => onSectionChange(id)}>
                    <Icon data-icon="inline-start" aria-hidden="true" />{label}
                  </Button>
                ))}
              </div>
              {!visibleSections.length && <p className="px-2 text-sm text-muted-foreground">Pengaturan tidak ditemukan.</p>}
            </nav>
          </aside>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-4 py-6 md:px-10 md:py-16 lg:py-24">
            <div className="mx-auto w-full max-w-[38rem]">
              <DialogHeader className="mb-8">
                <DialogTitle data-workspace-title="">{sections.find((item) => item.id === section)?.label}</DialogTitle>
                <DialogDescription>{section === "account" ? "Kelola profil akun Anda." : section === "security" ? "Kelola keamanan dan password akun Anda." : section === "api-key" ? "Kelola akses aplikasi eksternal ke peta risiko organisasi." : "Sesuaikan tampilan Manrisk pada perangkat ini."}</DialogDescription>
              </DialogHeader>
              {children}
            </div>
          </div>
      </DialogContent>
    </Dialog>
  );
}
