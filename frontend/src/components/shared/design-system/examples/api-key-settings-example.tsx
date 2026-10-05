"use client";

import { useState } from "react";
import { APIKeyPanel } from "@/components/settings/api-key-panel";
import type { OrganizationAPIKey } from "@/lib/api/organization-api-key";

const illustrativeKey: OrganizationAPIKey = {
  id: "example-key", organizationId: "example-organization", prefix: "mrk_contoh01",
  createdAt: "2026-10-01T02:00:00Z", updatedAt: "2026-10-04T03:00:00Z", lastUsedAt: null,
};

export function APIKeySettingsExample() {
  const [metadata, setMetadata] = useState<OrganizationAPIKey | null>(null);
  const [secret, setSecret] = useState("");
  return <APIKeyPanel metadata={metadata} secret={secret} loading={false} pending={false} error="" onGenerate={() => { setMetadata(illustrativeKey); setSecret("mrk_CONTOH_BUKAN_KREDENSIAL_AKTIF"); }} onDismissSecret={() => setSecret("")} onRetry={() => { setMetadata(null); setSecret(""); }} />;
}
