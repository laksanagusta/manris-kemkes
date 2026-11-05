"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import { listAllOrganizations } from "@/lib/api/organizations";
import { createRiskCharter } from "@/lib/api/risk-charters";
import type { RiskCharterUPRLevel } from "@/types/risk-charter";
import { FormHeader, FormPage } from "@/components/shared/form-shell";
import {
  ActionButton,
  Card,
  CardContent,
  FieldErrorMessage,
  Input,
  Label,
  LoadingActionButton,
} from "@/components/shared/design-system";

function normalizeUPRLevel(value?: string): RiskCharterUPRLevel | null {
  if (value === "kementerian" || value === "eksekutif") return "eksekutif";
  if (value === "upr_t1" || value === "upr_t2") return value;
  return null;
}

export function RiskCharterQuickCreate() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [title, setTitle] = useState("");
  const [uprLevel, setUprLevel] = useState<RiskCharterUPRLevel | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const openCharter = useCallback(
    (id: string) => router.replace(`/management/charters/${id}`),
    [router],
  );

  useEffect(() => {
    let active = true;
    async function loadContext() {
      if (!token || !user?.organizationId) {
        if (active) {
          setError("Organisasi aktif belum tersedia pada akun ini.");
          setLoadingContext(false);
        }
        return;
      }
      try {
        const organizations = await listAllOrganizations(token);
        const organization = organizations.find(
          (item) => item.id === user.organizationId,
        );
        const level = normalizeUPRLevel(organization?.uprLevel);
        if (!level) {
          throw new Error("Level UPR organisasi belum tersedia.");
        }
        if (active) setUprLevel(level);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Konteks organisasi belum dapat dimuat.",
          );
        }
      } finally {
        if (active) setLoadingContext(false);
      }
    }
    void loadContext();
    return () => {
      active = false;
    };
  }, [token, user?.organizationId]);

  const handleCreate = useCallback(async () => {
    const normalizedTitle = title.trim();
    if (!normalizedTitle) {
      setError("Judul Piagam wajib diisi.");
      return;
    }
    if (!token || !user?.organizationId || !uprLevel) {
      setError("Konteks organisasi belum siap untuk membuat Piagam.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const response = await createRiskCharter(token, {
        title: normalizedTitle,
        organizationId: user.organizationId,
        uprLevel,
      });
      if (response.existing) {
        toast.info(
          response.data.status === "draft"
            ? "Membuka draf Piagam yang sudah ada."
            : "Membuka Piagam yang sudah ada.",
        );
      }

      openCharter(response.data.id);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Draf Piagam belum berhasil dibuat.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [
    openCharter,
    title,
    token,
    uprLevel,
    user?.organizationId,
  ]);

  const creating = submitting || loadingContext;

  return (
    <FormPage>
      <FormHeader title="Buat Piagam" showTitle />
      <Card className="mx-auto w-full max-w-xl">
        <CardContent>
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!creating) void handleCreate();
            }}
          >
            <p className="text-sm text-muted-foreground">
              Beri judul untuk membuat draf versi pertama. Isi Piagam bisa dilengkapi setelah draf dibuat.
            </p>
            <div className="flex flex-col gap-2">
              <Label htmlFor="charter-title">Judul Piagam</Label>
              <Input
                id="charter-title"
                className="bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500"
                autoFocus
                maxLength={120}
                value={title}
                onChange={(event) => {
                  setTitle(event.target.value);
                  if (error && uprLevel) setError(null);
                }}
                placeholder="Contoh: Piagam Manajemen Risiko Direktorat"
                aria-invalid={Boolean(error && uprLevel)}
                aria-describedby={error ? "charter-create-error" : undefined}
              />
              <FieldErrorMessage id="charter-create-error">{error}</FieldErrorMessage>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <ActionButton asChild>
                <Link href="/management/charters">Kembali</Link>
              </ActionButton>
              <LoadingActionButton
                type="submit"
                variant="default"
                loading={creating}
                loadingLabel={loadingContext ? "Menyiapkan..." : "Membuat draf..."}
                disabled={!title.trim() || !uprLevel}
              >
                Buat draf
              </LoadingActionButton>
            </div>
          </form>
        </CardContent>
      </Card>
    </FormPage>
  );
}
