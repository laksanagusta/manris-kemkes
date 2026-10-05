"use client";

import { useState, type ReactNode } from "react";
import { KeyRound, Search, ShieldCheck, SlidersHorizontal, UserRound } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";

export type SettingsSection = "account" | "security" | "preferences" | "api-key";
const sections = [
  { id: "account" as const, label: "Account", icon: UserRound, keywords: "profil nama email nip jabatan pangkat password keamanan" },
  { id: "security" as const, label: "Keamanan", icon: ShieldCheck, keywords: "password kata sandi keamanan" },
  { id: "api-key" as const, label: "API key", icon: KeyRound, keywords: "integrasi heatmap peta risiko generate regenerate organisasi" },
  { id: "preferences" as const, label: "Preferences", icon: SlidersHorizontal, keywords: "tema tampilan terang gelap sistem" },
];

export function SettingsDialog({ open, onOpenChange, section, onSectionChange, children }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  section: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
  children: ReactNode;
}) {
  const [search, setSearch] = useState("");
  const visibleSections = sections.filter((item) => `${item.label} ${item.keywords}`.toLowerCase().includes(search.trim().toLowerCase()));
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!value) setSearch(""); onOpenChange(value); }}>
      <DialogContent className="h-[82svh] max-h-[900px] overflow-hidden sm:max-w-[1100px]">
        <div className="-m-4 grid min-h-0 grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[240px_minmax(0,1fr)] md:grid-rows-1">
          <aside className="flex min-h-0 flex-col gap-6 border-b bg-sidebar p-4 md:border-r md:border-b-0">
            <div className="pr-8 md:pr-0">
              <InputGroup>
                <InputGroupAddon><Search aria-hidden="true" /></InputGroupAddon>
                <InputGroupInput aria-label="Cari pengaturan" placeholder="Cari pengaturan..." value={search} onChange={(event) => setSearch(event.target.value)} />
              </InputGroup>
            </div>
            <nav aria-label="Menu pengaturan" className="min-h-0 overflow-y-auto">
              <p className="mb-2 px-2 text-xs text-tertiary-foreground">Pengaturan</p>
              <div className="flex gap-1 md:flex-col">
                {visibleSections.map(({ id, label, icon: Icon }) => (
                  <Button key={id} variant={section === id ? "secondary" : "ghost"} className={section === id ? "justify-start text-primary md:w-full" : "justify-start text-secondary-foreground md:w-full"} aria-current={section === id ? "page" : undefined} onClick={() => onSectionChange(id)}>
                    <Icon data-icon="inline-start" aria-hidden="true" />{label}
                  </Button>
                ))}
              </div>
              {!visibleSections.length && <p className="px-2 text-sm text-muted-foreground">Pengaturan tidak ditemukan.</p>}
            </nav>
          </aside>
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-6 md:px-10 md:py-8">
            <DialogHeader className="mb-8 pr-8">
              <DialogTitle>{sections.find((item) => item.id === section)?.label}</DialogTitle>
              <DialogDescription>{section === "account" ? "Kelola profil akun Anda." : section === "security" ? "Kelola keamanan dan password akun Anda." : section === "api-key" ? "Kelola akses aplikasi eksternal ke peta risiko organisasi." : "Sesuaikan tampilan Manrisk pada perangkat ini."}</DialogDescription>
            </DialogHeader>
            {children}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
