"use client";

import Link from "next/link";
import { ArrowRight, FileText, ClipboardList } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FormalReportsPage() {
  return (
    <div className="space-y-4">
      <section className="max-w-3xl space-y-2">
        <h2 className="text-base font-medium tracking-tight text-foreground text-balance">
          Laporan Monitoring & Evaluasi dipindahkan ke Evaluasi
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          Mulai sekarang, proses isi, finalisasi, dan ekspor PDF dilakukan dari
          modul Evaluasi. Halaman ini dipertahankan sebagai pengarah agar alur
          lama tidak dipakai lagi sebagai titik input utama.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="rounded-lg ring-1 ring-inset ring-border bg-card shadow-none">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <ClipboardList className="size-4" />
              Buka Evaluasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm leading-6 text-muted-foreground">
              Masuk ke daftar evaluasi untuk melihat draft, final, dan PDF yang
              sudah diekspor.
            </p>
            <Button asChild className="gap-2">
              <Link href="/evaluations">
                Ke Evaluasi
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="rounded-lg ring-1 ring-inset ring-border bg-card shadow-none">
          <CardHeader className="border-b border-border/40 pb-4">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <FileText className="size-4" />
              Buat Draft Baru
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm leading-6 text-muted-foreground">
              Langsung buat draft evaluasi untuk organisasi dan periode yang
              dipilih, lalu isi section dan finalisasi dari detail evaluasi.
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
