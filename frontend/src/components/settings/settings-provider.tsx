"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { useTheme } from "next-themes";
import { SettingsDialog, type SettingsSection } from "@/components/shared/design-system/layout/settings-dialog";
import { AccountSettings } from "./account-settings";
import { APIKeySettings } from "./api-key-settings";
import { ThemePreference } from "@/components/shared/design-system";
import { useAuth } from "@/contexts/auth-context";
import { MonitoringRulesSettings } from "./monitoring-rules-settings";

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
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "superadmin";
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<SettingsSection>("account");
  const openSettings = useCallback((nextSection: SettingsSection = "account") => {
    setSection(nextSection === "monitoring-rules" && !isSuperAdmin ? "account" : nextSection);
    setOpen(true);
  }, [isSuperAdmin]);
  const activeSection = section === "monitoring-rules" && !isSuperAdmin ? "account" : section;
  return <SettingsContext.Provider value={{ openSettings }}>
      {children}
      <SettingsDialog open={open} onOpenChange={setOpen} section={activeSection} onSectionChange={setSection} showMonitoringRules={isSuperAdmin}>
        {open && (activeSection === "account" ? <AccountSettings /> : activeSection === "security" ? <AccountSettings view="security" /> : activeSection === "api-key" ? <APIKeySettings /> : activeSection === "monitoring-rules" ? <MonitoringRulesSettings /> : <PreferencesSettings />)}
      </SettingsDialog>
  </SettingsContext.Provider>;
}
