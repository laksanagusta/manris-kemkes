"use client";

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function CardPatternsExample() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Panel dashboard</CardTitle>
          <CardDescription>Ringkasan data dengan jarak antarslot bawaan.</CardDescription>
          <CardAction><Badge variant="default" className="border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">Aktif</Badge></CardAction>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Grafik atau ringkasan dimulai sejajar dengan judul.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Identifikasi Risiko</CardTitle>
          <CardDescription>Tentukan konteks dan dampak risiko.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label htmlFor="card-pattern-risk">Risiko</Label>
          <Input id="card-pattern-risk" placeholder="Masukkan risiko" />
        </CardContent>
      </Card>
    </div>
  );
}
