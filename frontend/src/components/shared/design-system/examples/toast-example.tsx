"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ToastExample() {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Toast berhasil memakai centang yang terpusat di dalam lingkaran hijau.</p>
      <div className="flex flex-wrap gap-3">
      <Button variant="outline" onClick={() => toast("Notifikasi baru", { description: "Ada pembaruan yang dapat ditinjau." })}>Pesan</Button>
      <Button variant="outline" onClick={() => toast.success("Perubahan berhasil disimpan.")}>Berhasil</Button>
      <Button variant="outline" onClick={() => toast.error("Perubahan gagal disimpan.", { description: "Silakan coba lagi." })}>Gagal</Button>
      <Button variant="outline" onClick={() => toast.info("Laporan siap ditinjau.")}>Informasi</Button>
      <Button variant="outline" onClick={() => toast.warning("Lengkapi skor risiko sebelum finalisasi.")}>Peringatan</Button>
      <Button variant="outline" onClick={() => toast.promise(new Promise<void>((resolve) => setTimeout(resolve, 1200)), {
        loading: "Menyiapkan contoh laporan…",
        success: "Contoh laporan siap.",
        error: "Contoh laporan gagal disiapkan.",
      })}>Proses async</Button>
      </div>
    </div>
  );
}
