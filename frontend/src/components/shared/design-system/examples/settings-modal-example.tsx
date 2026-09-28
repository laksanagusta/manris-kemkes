"use client";

import { useState } from "react";
import Image from "next/image";
import { SettingsDialog, type SettingsSection } from "../layout/settings-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";

export function SettingsModalExample() {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<SettingsSection>("account");
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}>Buka Settings</Button>
    <SettingsDialog open={open} onOpenChange={setOpen} section={section} onSectionChange={setSection}>
      {section === "account" ? (
        <Card>
          <CardContent>
            <FieldGroup>
              <Field orientation="responsive"><FieldLabel htmlFor="settings-example-name">Nama lengkap</FieldLabel><Input id="settings-example-name" defaultValue="Dika Laksana" /></Field>
              <Field orientation="responsive"><FieldLabel htmlFor="settings-example-email">Email</FieldLabel><Input id="settings-example-email" defaultValue="nama@manris.local" /></Field>
            </FieldGroup>
          </CardContent>
        </Card>
      ) : section === "security" ? (
        <section className="space-y-3">
          <h2 className="text-sm text-muted-foreground">Keamanan</h2>
          <Card>
            <CardContent>
              <div className="grid gap-4 py-4 md:grid-cols-[minmax(180px,0.45fr)_minmax(0,1fr)] md:items-center">
                <div><h3 className="text-sm font-medium">Password</h3></div>
                <div className="flex justify-start md:justify-end"><Button variant="outline">Ganti Password</Button></div>
              </div>
              <Separator />
              <div className="grid gap-4 py-4 md:grid-cols-[minmax(140px,0.45fr)_minmax(0,1fr)]">
                <h3 className="text-sm font-medium">Perangkat aktif</h3>
                <div className="flex items-start gap-3 text-sm text-muted-foreground md:justify-self-end"><Image src="/device-mockups/macbook-air-silver.svg" alt="" width={56} height={32} className="mt-0.5 h-auto w-14 shrink-0 object-contain" aria-hidden="true" /><div><p className="text-sm font-medium text-foreground">Macintosh <span className="ml-1 rounded-md bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">Perangkat ini</span></p><p>Chrome 153.0.0.0</p><p>Sesi aktif di perangkat ini</p></div></div>
              </div>
            </CardContent>
          </Card>
        </section>
      ) : (
        <section className="space-y-3">
          <h2 className="text-sm text-muted-foreground">Tampilan</h2>
          <Card><CardContent><Field orientation="responsive"><FieldLabel htmlFor="settings-example-theme">Tema</FieldLabel><Input id="settings-example-theme" defaultValue="Terang" /></Field></CardContent></Card>
        </section>
      )}
    </SettingsDialog>
  </>;
}
