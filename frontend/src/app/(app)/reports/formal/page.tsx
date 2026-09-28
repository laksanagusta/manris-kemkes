"use client";

import Link from "next/link";
import { ArrowRight, FileText, ClipboardList } from "@/components/shared/icons";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CollectionPageHeader,
  PageStack,
} from "@/components/shared/design-system";

export default function FormalReportsPage() {
  return (
    <PageStack>
      <CollectionPageHeader title="Laporan Monitoring & Evaluasi dipindahkan ke Evaluasi" />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="">
          <CardHeader className="">
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="size-4" />
              Buka Evaluasi
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-secondary-foreground">
              Masuk ke daftar evaluasi untuk melihat draft, final, dan PDF yang
              sudah diekspor.
            </p>
            <Button asChild size="default" className="">
              <Link href="/evaluations">
                Ke Evaluasi
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="">
          <CardHeader className="">
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4" />
              Buat Draft Baru
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm leading-6 text-secondary-foreground">
              Langsung buat draft evaluasi untuk organisasi dan periode yang
              dipilih, lalu isi section dan finalisasi dari detail evaluasi.
            </p>
            <Button asChild variant="outline" size="default" className="">
              <Link href="/evaluations/new">
                Buat Evaluasi
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageStack>
  );
}
