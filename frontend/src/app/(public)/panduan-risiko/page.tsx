import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/ui/icons";
import { RiskGuidePage } from "@/components/guides/risk-guide-page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Panduan | MANRIS",
  description:
    "Pelajari proses risiko di MANRIS dari registrasi, penilaian, penanganan, hingga pemantauan melalui panduan langkah demi langkah.",
};

export default function PublicRiskGuidePage() {
  return (
    <div className="min-h-screen bg-background">
      <RiskGuidePage className="pb-6" />

      <section className="mx-auto flex w-full max-w-5xl px-4 pb-10 sm:px-6 sm:pb-14 lg:px-8">
        <Card className="w-full rounded-3xl bg-card/90">
          <CardHeader className="gap-2 border-b border-border/60 pb-5">
            <CardTitle className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Siap melanjutkan ke pencatatan risiko?
            </CardTitle>
            <CardDescription className="max-w-2xl text-sm leading-6 sm:text-base">
              Jika Anda sudah memahami alurnya, masuk ke MANRIS untuk mulai
              mencatat, menilai, dan memantau risiko bersama tim.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-5">
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              Anda dapat kembali ke halaman masuk kapan saja. Panduan ini tetap
              dapat dibaca terlebih dahulu tanpa login.
            </p>
          </CardContent>
          <CardFooter className="justify-start border-t-0 bg-transparent px-4 pb-5 pt-0">
            <Button asChild size="lg" className="font-semibold shadow-sm">
              <Link href="/login">
                Masuk ke MANRIS
                <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </CardFooter>
        </Card>
      </section>
    </div>
  );
}
