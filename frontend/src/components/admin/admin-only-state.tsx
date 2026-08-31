import Link from "next/link";
import { ArrowLeft, ShieldX } from "@/components/ui/icons";

import { ActionButton } from "@/components/shared/design-system";
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
          <ActionButton asChild variant="secondary" size="sm">
            <Link href="/overview">
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              Kembali ke dashboard
            </Link>
          </ActionButton>
        </CardContent>
      </Card>
    </div>
  );
}
