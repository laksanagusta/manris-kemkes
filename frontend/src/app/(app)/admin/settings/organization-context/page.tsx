"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import {
  listOrganizations,
  type OrganizationListItem,
} from "@/lib/api/organizations";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Check,
  Building2,
  ChevronDown,
  Loader2,
  Search,
  Settings2,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Organization {
  id: string;
  name: string;
  context: string;
}

export default function OrganizationContextPage() {
  const { user, token } = useAuth();

  const authToken = token ?? undefined;

  const [organizationOptions, setOrganizationOptions] = useState<
    OrganizationListItem[]
  >([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [orgName, setOrgName] = useState<string>("");
  const [context, setContext] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isOrgPickerOpen, setIsOrgPickerOpen] = useState(false);
  const [orgQuery, setOrgQuery] = useState("");
  const [isOrgQueryLoading, setIsOrgQueryLoading] = useState(false);
  const [orgQueryError, setOrgQueryError] = useState("");

  const isSuperAdmin = user?.role === "superadmin";
  const MAX_LENGTH = 2000;
  const currentLength = context.length;

  const fetchOrgDetails = useCallback(
    async (id: string) => {
      if (!id) return;
      try {
        const org = await api.get<Organization>(
          `/organizations/${id}`,
          authToken,
        );
        if (org) {
          setOrgName(org.name || "");
          setContext(org.context || "");
        }
      } catch (error) {
        toast.error("Gagal memuat detail organisasi.");
        console.error(error);
      }
    },
    [authToken],
  );

  const loadOrganizations = useCallback(
    async (query: string) => {
      if (!authToken) {
        setOrganizationOptions([]);
        return;
      }

      try {
        setIsOrgQueryLoading(true);
        setOrgQueryError("");

        const response = await listOrganizations(authToken, {
          q: query.trim() || undefined,
          page: 1,
          limit: 20,
        });

        setOrganizationOptions(response.data || []);
      } catch (error) {
        setOrgQueryError("Gagal memuat daftar organisasi.");
        toast.error("Gagal memuat daftar organisasi.");
        console.error(error);
      } finally {
        setIsOrgQueryLoading(false);
      }
    },
    [authToken],
  );

  useEffect(() => {
    if (!user) return;

    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        if (isSuperAdmin) {
          if (!authToken) {
            setOrganizationOptions([]);
            return;
          }

          const res = await listOrganizations(authToken ?? "", {
            page: 1,
            limit: 20,
          });
          const orgs = res.data || [];
          setOrganizationOptions(orgs);

          const defaultOrg = orgs[0]?.id || "";
          setSelectedOrgId(defaultOrg);
          if (defaultOrg) {
            await fetchOrgDetails(defaultOrg);
          }
        } else if (user.organizationId) {
          setSelectedOrgId(user.organizationId);
          await fetchOrgDetails(user.organizationId);
        }
      } catch (error) {
        toast.error("Gagal memuat data organisasi.");
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInitialData();
  }, [user, isSuperAdmin, authToken, fetchOrgDetails]);

  useEffect(() => {
    if (!isSuperAdmin || !isOrgPickerOpen) return;

    const timeoutId = window.setTimeout(() => {
      void loadOrganizations(orgQuery);
    }, 300);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isOrgPickerOpen, isSuperAdmin, loadOrganizations, orgQuery]);

  const handleOrgChange = useCallback(
    async (id: string) => {
      setSelectedOrgId(id);
      setIsOrgPickerOpen(false);
      setOrgQuery("");
      setIsLoading(true);
      await fetchOrgDetails(id);
      setIsLoading(false);
    },
    [fetchOrgDetails],
  );

  const handleSave = async () => {
    if (!selectedOrgId) {
      toast.error("Tidak ada organisasi yang dipilih.");
      return;
    }

    try {
      setIsSaving(true);
      await api.put(
        `/organizations/${selectedOrgId}`,
        {
          name: orgName,
          context: context,
        },
        authToken,
      );
      toast.success("Konteks organisasi berhasil disimpan.");
    } catch (error) {
      toast.error("Gagal menyimpan konteks organisasi.");
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const getCounterColor = () => {
    if (currentLength >= 1950) return "text-destructive";
    if (currentLength >= 1800) return "text-amber-500";
    return "text-muted-foreground";
  };

  if (!user) return null;

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-[68ch] space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Pengaturan organisasi
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-foreground text-balance sm:text-4xl">
            Konteks Organisasi
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground text-pretty">
            Atur dan perbarui konteks internal maupun eksternal organisasi agar
            penilaian risiko tetap selaras dengan keadaan operasional yang
            nyata.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={isLoading || isSaving}
          className="w-full gap-2 shadow-lg shadow-primary/20 sm:w-auto"
        >
          <Save className="size-4" />
          {isSaving ? "Menyimpan..." : "Simpan Konteks"}
        </Button>
      </div>

      <Card className="max-w-4xl border-border/50 bg-card/80">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-foreground">
            Informasi Konteks
          </CardTitle>
          <CardDescription className="max-w-2xl text-sm leading-6">
            Deskripsikan ruang lingkup, sasaran, serta kondisi lingkungan
            internal dan eksternal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSuperAdmin && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                Pilih Organisasi
              </Label>
              <div className="relative space-y-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={() => setIsOrgPickerOpen((current) => !current)}
                  className={cn(
                    "w-full justify-between gap-2 sm:max-w-md",
                    !selectedOrgId && "text-muted-foreground",
                  )}
                >
                  <span className="truncate">
                    {orgName || "Pilih organisasi..."}
                  </span>
                  <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
                </Button>

                {isOrgPickerOpen ? (
                  <div className="absolute top-full left-0 z-30 mt-2 w-full max-w-md rounded-xl border border-border/60 bg-card p-2.5 shadow-lg">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 rounded-md border border-input bg-background px-2.5">
                        <Search className="size-4 shrink-0 text-muted-foreground" />
                        <Input
                          value={orgQuery}
                          onChange={(event) => setOrgQuery(event.target.value)}
                          placeholder="Cari organisasi..."
                          aria-label="Cari organisasi"
                          className="h-9 border-0 bg-transparent px-0 focus-visible:ring-0"
                        />
                      </div>

                      <div className="max-h-72 overflow-y-auto pr-1">
                        <div className="space-y-1">
                          {isOrgQueryLoading ? (
                            <div className="flex items-center justify-center gap-2 rounded-md px-3 py-6 text-sm text-muted-foreground">
                              <Loader2 className="size-4 animate-spin" />
                              Memuat organisasi...
                            </div>
                          ) : null}

                          {!isOrgQueryLoading && orgQueryError ? (
                            <div className="rounded-md px-3 py-6 text-sm text-muted-foreground">
                              {orgQueryError}
                            </div>
                          ) : null}

                          {!isOrgQueryLoading &&
                          !orgQueryError &&
                          organizationOptions.length === 0 ? (
                            <div className="rounded-md px-3 py-6 text-sm text-muted-foreground">
                              Tidak ada organisasi ditemukan.
                            </div>
                          ) : null}

                          {organizationOptions.map((organization) => {
                            const isSelected =
                              organization.id === selectedOrgId;

                            return (
                              <button
                                key={organization.id}
                                type="button"
                                onClick={() =>
                                  void handleOrgChange(organization.id)
                                }
                                className={cn(
                                  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                                  isSelected &&
                                    "bg-accent text-accent-foreground",
                                )}
                              >
                                <span className="min-w-0 flex-1 truncate">
                                  {organization.name}
                                </span>
                                {isSelected ? (
                                  <Check className="size-4 shrink-0" />
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {!isSuperAdmin && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Building2 className="size-4 text-muted-foreground" />
                Organisasi
              </Label>
              <div className="flex h-10 items-center rounded-md border border-input bg-muted/50 px-3 py-2 text-sm leading-6 text-foreground">
                {isLoading
                  ? "Memuat..."
                  : orgName || "Tidak ada nama organisasi"}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label
                htmlFor="context-textarea"
                className="text-sm font-medium text-foreground"
              >
                Konteks (Internal & Eksternal)
              </Label>
              <span
                className={cn(
                  "text-xs font-medium tabular-nums transition-colors",
                  getCounterColor(),
                )}
              >
                {currentLength} / {MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id="context-textarea"
              placeholder="Tuliskan kondisi internal, eksternal, mandat, batasan, dan faktor penting lain yang memengaruhi risiko."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              maxLength={MAX_LENGTH}
              disabled={isLoading}
              className="min-h-[320px] resize-y bg-background text-sm leading-6"
            />
            <p className="mt-2 max-w-2xl text-xs leading-5 text-muted-foreground">
              Konteks ini akan menjadi acuan dalam identifikasi dan evaluasi
              risiko.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
