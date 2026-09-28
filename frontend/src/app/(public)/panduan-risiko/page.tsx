import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "@/components/shared/icons";
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

      <section className="mx-auto flex w-full max-w-7xl px-4 pb-10 sm:px-6 sm:pb-14 lg:px-8">
        <Card className="w-full">
          <CardHeader className="gap-2">
            <CardTitle>
              Siap melanjutkan ke pencatatan risiko?
            </CardTitle>
            <CardDescription className="max-w-2xl">
              Jika Anda sudah memahami alurnya, masuk ke MANRIS untuk mulai
              mencatat, menilai, dan memantau risiko bersama tim.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
              Anda dapat kembali ke halaman masuk kapan saja. Panduan ini tetap
              dapat dibaca terlebih dahulu tanpa login.
            </p>
          </CardContent>
          <CardFooter className="justify-start">
            <Button asChild size="lg">
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
