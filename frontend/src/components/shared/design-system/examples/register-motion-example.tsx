"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PopoverSelectField } from "../fields/popover-select-field";
import { MonitoringInsightCard } from "../domain/monitoring-insight-card";
import { RegisterSortIcon } from "../motion/register-motion";

export function RegisterMotionExample() {
  const [descending, setDescending] = useState(true);
  const [finalized, setFinalized] = useState(6);
  const [status, setStatus] = useState("all");
  return (
    <section className="flex flex-col gap-4" data-register-motion>
      <h2 className="text-lg font-medium">Motion Register Risiko</h2>
      <p className="text-sm text-muted-foreground">Menu 250ms/150ms mengikuti titik asal pemicu; dialog memakai skala 0.96. Ikon sort berganti dalam slot tetap, angka berubah dengan digit pop-in, dan progres bergerak 300ms. Hover, press, fokus, serta reduced motion memakai aturan bersama.</p>
      <div className="flex flex-wrap items-center gap-2">
        <PopoverSelectField value={status} onValueChange={setStatus} placeholder="Status" options={[{ value: "all", label: "Semua Status" }, { value: "final", label: "Final" }]} fitContent contentClassName="register-motion-menu" ariaLabel="Contoh filter status" />
        <Button variant="outline" onClick={() => setFinalized((value) => value === 10 ? 6 : value + 1)}>Perbarui metrik</Button>
        <Dialog>
          <DialogTrigger asChild><Button variant="outline">Buka dialog</Button></DialogTrigger>
          <DialogContent className="register-motion-dialog">
            <DialogHeader><DialogTitle>Konfirmasi Pemantauan</DialogTitle><DialogDescription>Contoh motion dialog Register Risiko dengan perilaku fokus dan Escape bawaan.</DialogDescription></DialogHeader>
            <p className="text-sm">Dialog masuk dengan skala lembut dan keluar lebih cepat.</p>
            <DialogFooter showCloseButton />
          </DialogContent>
        </Dialog>
      </div>
      <MonitoringInsightCard motion cycle="2026-Q3" total={10} finalized={finalized} highPending={10 - finalized} increased={2} overdue={3} />
      <Table>
        <TableHeader><TableRow><TableHead>Risiko</TableHead><TableHead className="text-right"><Button variant="ghost" size="sm" onClick={() => setDescending((value) => !value)} aria-label="Ubah urutan skor"><RegisterSortIcon descending={descending} />Skor</Button></TableHead></TableRow></TableHeader>
        <TableBody><TableRow><TableCell><Tooltip><TooltipTrigger asChild><span tabIndex={0}>Keterlambatan pelaporan</span></TooltipTrigger><TooltipContent className="register-motion-tooltip">Contoh tooltip riwayat risiko</TooltipContent></Tooltip></TableCell><TableCell className="text-right">12</TableCell></TableRow></TableBody>
      </Table>
    </section>
  );
}
