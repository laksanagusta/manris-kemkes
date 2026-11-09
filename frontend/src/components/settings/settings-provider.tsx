"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { SettingsDialog, type SettingsSection } from "@/components/shared/design-system/layout/settings-dialog";
import { AccountSettings } from "./account-settings";
import { APIKeySettings } from "./api-key-settings";
import { ThemePreference } from "@/components/shared/design-system";

const SettingsContext = createContext<{ openSettings: (section?: SettingsSection) => void } | null>(null);

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error("useSettings must be used within SettingsProvider");
  return context;
}

function PreferencesSettings() {
  const { theme, setTheme } = useTheme();
  return <ThemePreference value={theme ?? "system"} onChange={setTheme} />;
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
        {open && (section === "account" ? <AccountSettings /> : section === "security" ? <AccountSettings view="security" /> : section === "api-key" ? <APIKeySettings /> : <PreferencesSettings />)}
      </SettingsDialog>
  </SettingsContext.Provider>;
}
