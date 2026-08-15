import Link from "next/link";
import { ShieldX } from "@/components/ui/icons";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

type AdminOnlyStateProps = {
  title?: string;
  description?: string;
};

export function AdminOnlyState({
  title = "Halaman ini hanya untuk Super Admin",
  description = "Administrasi pengguna hanya tersedia untuk Super Admin. Hubungi administrator utama jika Anda memerlukan bantuan pengelolaan akun.",
}: AdminOnlyStateProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-10rem)] max-w-xl items-center justify-center">
      <Card className="w-full bg-card/95">
        <CardHeader className="items-start gap-4 text-left">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldX />
          </div>
          <div className="space-y-2">
            <CardTitle>{title}</CardTitle>
            <CardDescription className="text-sm leading-6">
              {description}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild variant="outline">
            <Link href="/overview">Kembali ke dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
