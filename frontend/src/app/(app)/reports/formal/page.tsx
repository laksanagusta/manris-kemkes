"use client";

import Link from "next/link";
import { ArrowRight, FileText, ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FormalReportsPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      <section className="max-w-3xl space-y-3">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          <span>Laporan Formal</span>
          <span className="h-px w-6 bg-border" />
          <span>Handoff</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-balance">
          Laporan Monitoring & Evaluasi MR dipindahkan ke Evaluasi MR
        </h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Mulai sekarang, proses isi, finalisasi, dan ekspor PDF dilakukan dari modul
          Evaluasi MR. Halaman ini dipertahankan sebagai pengarah agar alur lama tidak
          dipakai lagi sebagai titik input utama.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-border/50 bg-card/90 shadow-sm">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="size-4" />
              Buka Evaluasi MR
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm leading-6 text-muted-foreground">
              Masuk ke daftar evaluasi untuk melihat draft, final, dan PDF yang sudah
              diekspor.
            </p>
            <Button asChild className="gap-2">
              <Link href="/evaluations">
                Ke Evaluasi MR
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/50 bg-card/90 shadow-sm">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="size-4" />
              Buat Draft Baru
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm leading-6 text-muted-foreground">
              Langsung buat draft evaluasi untuk organisasi dan periode yang dipilih,
              lalu isi section dan finalisasi dari detail evaluasi.
            </p>
            <Button asChild variant="outline" className="gap-2">
              <Link href="/evaluations/new">
                Buat Evaluasi
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
