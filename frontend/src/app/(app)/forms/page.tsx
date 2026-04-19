"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { fetchMyForms } from "@/lib/api/forms";
import type { Form } from "@/types/form";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { FileText, ClipboardEdit } from "lucide-react";

const statusBadgeClasses: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  published: "bg-emerald-500/15 text-emerald-600 border-emerald-500/20 dark:text-emerald-400",
  closed: "bg-destructive/15 text-destructive border-destructive/20",
};

export default function MyFormsPage() {
  const { token } = useAuth();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const load = async () => {
      try {
        setLoading(true);
        const data = await fetchMyForms(token);
        setForms(data);
      } catch (err) {
        console.error(err);
        toast.error("Gagal memuat formulir yang ditugaskan.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [token]);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Forms</h1>
          <p className="text-sm text-muted-foreground">
            Formulir yang ditugaskan kepada Anda untuk diisi
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="border-border/50 bg-card/80">
              <CardHeader className="pb-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3 mt-1" />
                <Skeleton className="h-9 w-full mt-4" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">My Forms</h1>
        <p className="text-sm text-muted-foreground">
          Formulir yang ditugaskan kepada Anda untuk diisi
        </p>
      </div>

      {forms.length === 0 ? (
        <Card className="border-border/50 bg-card/80 py-16">
          <CardContent>
            <div className="flex flex-col gap-1 text-left">
              <p className="text-sm font-medium text-muted-foreground">Tidak ada formulir yang ditugaskan kepada Anda</p>
              <p className="text-xs text-muted-foreground/70">Formulir akan muncul di sini setelah admin mempublikasikannya</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card
              key={form.id}
              className="border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-md transition-shadow"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm font-semibold leading-tight line-clamp-2">
                    {form.title}
                  </CardTitle>
                  <Badge
                    className={cn(
                      "text-[10px] font-semibold border h-5 px-1.5 capitalize shrink-0",
                      statusBadgeClasses[form.status] ?? statusBadgeClasses.published
                    )}
                  >
                    {form.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {form.description ? (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {form.description}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground/60 italic">
                    Tidak ada deskripsi
                  </p>
                )}
                <Link href={`/forms/${form.id}/fill`} className="w-full">
                  <Button className="w-full gap-2">
                    <ClipboardEdit className="size-4" />
                    Isi Formulir
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
