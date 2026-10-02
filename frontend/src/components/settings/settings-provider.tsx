"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "@/components/shared/icons";
import { SettingsDialog, type SettingsSection } from "@/components/shared/design-system/layout/settings-dialog";
import { AccountSettings } from "./account-settings";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const SettingsContext = createContext<{ openSettings: (section?: SettingsSection) => void } | null>(null);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
}

function PreferencesSettings() {
  const { theme, setTheme } = useTheme();
  return <section className="space-y-3" aria-labelledby="preferences-display-heading">
    <div>
      <h2 id="preferences-display-heading" className="text-sm text-muted-foreground">Tampilan</h2>
    </div>
    <Card>
      <CardContent><FieldGroup><Field orientation="responsive"><FieldLabel htmlFor="settings-theme">Tema</FieldLabel>
        <Select value={theme ?? "light"} onValueChange={setTheme}>
          <SelectTrigger id="settings-theme"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="light"><Sun aria-hidden="true" />Terang</SelectItem>
            <SelectItem value="dark"><Moon aria-hidden="true" />Gelap</SelectItem>
            <SelectItem value="system"><Monitor aria-hidden="true" />Ikuti sistem</SelectItem>
          </SelectContent>
        </Select>
      </Field></FieldGroup></CardContent>
    </Card>
  </section>;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<SettingsSection>("account");
  const openSettings = useCallback((nextSection: SettingsSection = "account") => {
    setSection(nextSection);
    setOpen(true);
  }, []);
  return <SettingsContext.Provider value={{ openSettings }}>
      {children}
      <SettingsDialog open={open} onOpenChange={setOpen} section={section} onSectionChange={setSection}>
        {section === "account" ? <AccountSettings /> : section === "security" ? <AccountSettings view="security" /> : <PreferencesSettings />}
      </SettingsDialog>
  </SettingsContext.Provider>;
}
