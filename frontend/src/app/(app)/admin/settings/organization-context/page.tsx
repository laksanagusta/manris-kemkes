"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Settings2, Save, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Organization {
  id: string;
  name: string;
  context: string;
}

export default function OrganizationContextPage() {
  const { user, token } = useAuth();
  
  const authToken = token ?? undefined;
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<string>("");
  const [orgName, setOrgName] = useState<string>("");
  const [context, setContext] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const isSuperAdmin = user?.role === "superadmin";
  const MAX_LENGTH = 2000;
  const currentLength = context.length;

  useEffect(() => {
    if (!user) return;

    const fetchInitialData = async () => {
      try {
        setIsLoading(true);
        if (isSuperAdmin) {
          const res = await api.get<{ data: Organization[] }>("/organizations", authToken);
          const orgs = res.data || [];
          setOrganizations(orgs);
          
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
  }, [user, isSuperAdmin]);

  const fetchOrgDetails = async (id: string) => {
    if (!id) return;
    try {
      const res = await api.get<{ data: Organization }>(`/organizations/${id}`, authToken);
      const org = res.data;
      if (org) {
        setOrgName(org.name || "");
        setContext(org.context || "");
      }
    } catch (error) {
      toast.error("Gagal memuat detail organisasi.");
      console.error(error);
    }
  };

  const handleOrgChange = async (id: string) => {
    setSelectedOrgId(id);
    setIsLoading(true);
    await fetchOrgDetails(id);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!selectedOrgId) {
      toast.error("Tidak ada organisasi yang dipilih.");
      return;
    }

    try {
      setIsSaving(true);
      await api.put(`/organizations/${selectedOrgId}`, {
        name: orgName,
        context: context,
      }, authToken);
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
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Konteks Organisasi</h1>
          <p className="text-sm text-muted-foreground">
            Atur dan perbarui konteks internal maupun eksternal organisasi Anda.
          </p>
        </div>
        <Button 
          onClick={handleSave} 
          disabled={isLoading || isSaving}
          className="gap-2 shadow-lg shadow-primary/20 w-full sm:w-auto"
        >
          <Save className="size-4" />
          {isSaving ? "Menyimpan..." : "Simpan Perubahan"}
        </Button>
      </div>

      <Card className="border-border/50 bg-card/80 max-w-4xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <Settings2 className="size-5 text-primary" />
            Informasi Konteks
          </CardTitle>
          <CardDescription>
            Deskripsikan ruang lingkup, sasaran, serta kondisi lingkungan internal dan eksternal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSuperAdmin && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" />
                Pilih Organisasi
              </Label>
              <Select
                disabled={isLoading || organizations.length === 0}
                value={selectedOrgId}
                onValueChange={handleOrgChange}
              >
                <SelectTrigger className="w-full sm:max-w-md">
                  <SelectValue placeholder="Pilih organisasi..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {!isSuperAdmin && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="size-4 text-muted-foreground" />
                Organisasi
              </Label>
              <div className="h-10 px-3 py-2 rounded-md border border-input bg-muted/50 text-sm flex items-center">
                {isLoading ? "Memuat..." : orgName || "Tidak ada nama organisasi"}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="context-textarea">Konteks (Internal & Eksternal)</Label>
              <span className={cn("text-xs font-medium transition-colors", getCounterColor())}>
                {currentLength} / {MAX_LENGTH}
              </span>
            </div>
            <Textarea
              id="context-textarea"
              placeholder="Tuliskan konteks organisasi di sini..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              maxLength={MAX_LENGTH}
              disabled={isLoading}
              className="min-h-[300px] resize-y bg-background"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Konteks ini akan menjadi acuan dalam identifikasi dan evaluasi risiko.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
