"use client";

import { useEffect, useState } from "react";
import { Loader2, Shield, Users } from "@/components/ui/icons";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/auth-context";
import { listAllOrganizations } from "@/lib/api/organizations";
import type { Organization } from "@/lib/organization";
import { OrganizationGroupManagement } from "@/components/organization-group/organization-group-management";
import {
  CollectionPageHeader,
  PageStack,
} from "@/components/shared/design-system";

function PlaceholderTab() {
  return (
    <Card className="bg-card/80 backdrop-blur-sm">
      <CardHeader className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="gap-1.5">
            <Users className="size-3.5" />
            Segera hadir
          </Badge>
        </div>
        <CardTitle className="text-sm font-semibold">Grup Pengguna</CardTitle>
        <CardDescription>
          Tab ini disiapkan untuk pengelompokan pengguna di tahap berikutnya.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border border-dashed border-border/60 bg-muted/20 px-4 py-8 text-sm text-muted-foreground">
          Struktur halaman sudah disiapkan. Saat fitur{" "}
          <span className="font-medium text-foreground">Grup Pengguna</span>{" "}
          masuk, tab ini akan dipakai tanpa ubah navigasi utama.
        </div>
      </CardContent>
    </Card>
  );
}

export default function SettingsGroupsPage() {
  const { token, user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(true);

  useEffect(() => {
    if (!token) {
      setOrganizations([]);
      setLoadingOrganizations(false);
      return;
    }

    let cancelled = false;
    setLoadingOrganizations(true);

    listAllOrganizations(token)
      .then((items) => {
        if (cancelled) return;
        setOrganizations(items);
      })
      .catch((error) => {
        if (cancelled) return;
        console.error("Failed to fetch organizations", error);
        setOrganizations([]);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingOrganizations(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <PageStack>
      <CollectionPageHeader
        title="Grup"
      />

      <Tabs defaultValue="organizations" className="space-y-6">
        <TabsList className="w-fit">
          <TabsTrigger value="organizations">Organisasi</TabsTrigger>
          <TabsTrigger value="users">Pengguna</TabsTrigger>
        </TabsList>

        <TabsContent value="organizations" className="space-y-6">
          {loadingOrganizations ? (
            <Card className="bg-card/80 backdrop-blur-sm">
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </CardContent>
            </Card>
          ) : (
            <OrganizationGroupManagement
              token={token ?? null}
              user={user}
              organizations={organizations}
            />
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <PlaceholderTab />
        </TabsContent>
      </Tabs>
    </PageStack>
  );
}
