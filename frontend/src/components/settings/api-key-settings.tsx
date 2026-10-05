"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { generateOrganizationAPIKey, getOrganizationAPIKey, type OrganizationAPIKey } from "@/lib/api/organization-api-key";
import { listAllOrganizations, type OrganizationListItem } from "@/lib/api/organizations";
import { APIKeyPanel } from "./api-key-panel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function OrganizationKey({ orgId, token }: { orgId: string; token: string }) {
  const [metadata, setMetadata] = useState<OrganizationAPIKey | null>(null);
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  useEffect(() => {
    let ignore = false;
    getOrganizationAPIKey(orgId, token).then((key) => {
      if (!ignore) { setMetadata(key); setError(""); }
    }).catch((err: unknown) => {
      if (!ignore) setError(err instanceof Error ? err.message : "Gagal memuat API key.");
    }).finally(() => { if (!ignore) setLoading(false); });
    return () => { ignore = true; };
  }, [orgId, token, revision]);

  function reload() { setLoading(true); setSecret(""); setRevision((value) => value + 1); }

  async function generate(): Promise<boolean> {
    if (pending) return false;
    setPending(true);
    try {
      const result = await generateOrganizationAPIKey(orgId, token, metadata?.id);
      if (!mounted.current) return false;
      setMetadata(result.key);
      setSecret(result.secret);
      setError("");
      toast.success(metadata ? "API key diganti. Simpan key baru sekarang." : "API key dibuat. Simpan key sekarang.");
      return true;
    } catch (err) {
      if (!mounted.current) return false;
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan API key.");
      if (err instanceof ApiError && err.status === 409) reload();
      return false;
    } finally { if (mounted.current) setPending(false); }
  }

  return <APIKeyPanel metadata={metadata} secret={secret} loading={loading} pending={pending} error={error} onGenerate={generate} onDismissSecret={() => setSecret("")} onRetry={reload} />;
}

export function APIKeySettings() {
  const { user, token } = useAuth();
  const [organizations, setOrganizations] = useState<OrganizationListItem[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState(user?.organizationId ?? "");
  const [orgError, setOrgError] = useState("");
  const [orgLoading, setOrgLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const isSuperAdmin = user?.role === "superadmin";

  useEffect(() => {
    if (!isSuperAdmin || !token) return;
    let ignore = false;
    listAllOrganizations(token).then((items) => {
      if (!ignore) { setOrganizations(items); setOrgError(""); }
    }).catch((err: unknown) => {
      if (!ignore) setOrgError(err instanceof Error ? err.message : "Gagal memuat organisasi.");
    }).finally(() => { if (!ignore) setOrgLoading(false); });
    return () => { ignore = true; };
  }, [isSuperAdmin, token, revision]);

  if (!user || !token) return null;
  const orgId = isSuperAdmin ? selectedOrgId : user.organizationId;

  return <div className="space-y-4">
    {isSuperAdmin && <>
      <Field><FieldLabel htmlFor="api-key-organization">Organisasi</FieldLabel><Select value={selectedOrgId} onValueChange={setSelectedOrgId} disabled={orgLoading || Boolean(orgError)}><SelectTrigger id="api-key-organization"><SelectValue placeholder={orgLoading ? "Memuat organisasi…" : "Pilih organisasi"} /></SelectTrigger><SelectContent>{organizations.map((org) => <SelectItem key={org.id} value={org.id}>{org.name}</SelectItem>)}</SelectContent></Select></Field>
      {orgError && <Alert variant="destructive"><AlertDescription>{orgError}</AlertDescription><div className="mt-2"><Button variant="outline" onClick={() => { setOrgLoading(true); setRevision((value) => value + 1); }}>Coba lagi</Button></div></Alert>}
    </>}
    {orgId ? <OrganizationKey key={`${user.id}:${orgId}`} orgId={orgId} token={token} /> : <Alert><AlertDescription>{isSuperAdmin ? "Pilih organisasi untuk mengelola API key." : "Akun Anda belum terhubung ke organisasi. Hubungi administrator untuk mengatur organisasi akun."}</AlertDescription></Alert>}
  </div>;
}
