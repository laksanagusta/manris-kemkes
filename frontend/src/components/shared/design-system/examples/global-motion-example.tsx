"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/shared/animated-tabs";
import { LoadingActionButton } from "../actions/loading-action-button";
import { MotionNumber, MotionSuccessCheck, MotionText } from "../motion/motion-primitives";

export function GlobalMotionExample() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(24);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const process = () => {
    setLoading(true);
    setSaved(false);
    timer.current = setTimeout(() => {
      setLoading(false);
      setSaved(true);
      toast.success("Contoh selesai", { description: "Ikon sukses memakai path yang diukur saat ditampilkan." });
    }, 900);
  };
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-medium">Motion bersama</h2>
      <p className="text-sm text-muted-foreground">Semua menu, dialog, sheet, tooltip, tab, field, dan progres menggunakan token transitions-dev. Reduced motion mematikan gerakan dekoratif di halaman publik, workspace, dan portal. Sidebar memilih menu secara langsung; drawer mempertahankan drag bawaan.</p>
      <Card>
        <CardHeader><CardTitle>Umpan balik interaksi</CardTitle><CardDescription>Angka, teks, panel, resize, validasi, dan konfirmasi menggunakan komponen produksi.</CardDescription></CardHeader>
        <CardContent className="flex flex-col gap-6">
          <Tabs defaultValue="updates">
            <TabsList><TabsTrigger value="updates">Perubahan nilai</TabsTrigger><TabsTrigger value="validation">Validasi</TabsTrigger></TabsList>
            <TabsContent value="updates" className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-2xl tabular-nums"><MotionNumber value={count} /></span>
                <Button variant="outline" onClick={() => setCount((value) => value + 1)}>Ubah angka</Button>
                <LoadingActionButton loading={loading} loadingLabel="Memproses..." onClick={process}>Simpan contoh</LoadingActionButton>
                <MotionText value={saved ? "Tersimpan" : loading ? "Sedang diproses" : "Siap diproses"} />
                {saved && <MotionSuccessCheck />}
              </div>
              <Progress value={count % 100} aria-label="Contoh progres" />
              <Button variant="outline" aria-expanded={open} aria-controls="global-motion-panel" onClick={() => setOpen((value) => !value)}>Tampilkan panel</Button>
              <div className="motion-panel" data-open={open}>
                <div className="min-h-0 overflow-hidden">
                  <div id="global-motion-panel" className="t-panel-slide [--panel-translate-y:8px]" data-open={open} inert={!open} aria-hidden={!open}>
                    <p className="text-sm text-muted-foreground">Panel masuk dan keluar dengan transisi yang menjaga posisi kontrol.</p>
                  </div>
                </div>
              </div>
              <div className="t-resize max-w-full overflow-hidden rounded-lg bg-muted p-4" style={{ width: open ? 360 : 260, height: open ? 100 : 72 }}>
                <p className="text-sm">Resize mengikuti token 300ms.</p>
              </div>
            </TabsContent>
            <TabsContent value="validation">
              <form className="flex flex-col gap-3" onSubmit={(event) => { event.preventDefault(); toast.success("Validasi berhasil"); }}>
                <Label htmlFor="motion-required">Nama contoh (wajib)</Label>
                <Input id="motion-required" required placeholder="Kosongkan untuk menguji feedback" />
                <p className="text-xs text-muted-foreground">Submit kosong untuk mengulang shake. Validasi native tetap aktif.</p>
                <Button type="submit">Uji validasi</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </section>
  );
}
