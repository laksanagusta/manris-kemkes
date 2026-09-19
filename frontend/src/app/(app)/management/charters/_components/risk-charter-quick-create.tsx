"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import { ArrowRight, FilePlus2 } from "@/components/ui/icons";

import { useAuth } from "@/contexts/auth-context";
import { listAllOrganizations } from "@/lib/api/organizations";
import { createRiskCharter } from "@/lib/api/risk-charters";
import { currentAssessmentCycle } from "@/lib/risk-cycle-options";
import type { RiskCharter, RiskCharterUPRLevel } from "@/types/risk-charter";
import { FormHeader, FormPage } from "@/components/shared/form-shell";
import {
  AccentButton,
  Card,
  CardContent,
  CollectionDialogCancel,
  CollectionNotice,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FieldErrorMessage,
  Input,
  Label,
  LoadingActionButton,
} from "@/components/shared/design-system";

type RiskCharterQuickCreateProps = {
  presentation: "dialog" | "page";
};

function normalizeUPRLevel(value?: string): RiskCharterUPRLevel | null {
  if (value === "kementerian" || value === "eksekutif") return "eksekutif";
  if (value === "upr_t1" || value === "upr_t2") return value;
  return null;
}

function currentFiscalYear() {
  return currentAssessmentCycle().slice(0, 4);
}

export function RiskCharterQuickCreate({
  presentation,
}: RiskCharterQuickCreateProps) {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const { token, user } = useAuth();
  const [open, setOpen] = useState(true);
  const [title, setTitle] = useState("");
  const [uprLevel, setUprLevel] = useState<RiskCharterUPRLevel | null>(null);
  const [loadingContext, setLoadingContext] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existing, setExisting] = useState<RiskCharter | null>(null);
  const pendingNavigationRef = useRef<string | null>(null);

  const close = useCallback(() => {
    if (presentation === "dialog") {
      pendingNavigationRef.current = "__back__";
      setOpen(false);
      if (reducedMotion) {
        window.requestAnimationFrame(() => {
          pendingNavigationRef.current = null;
          router.back();
        });
      }
      return;
    }
    router.push("/management/charters");
  }, [presentation, reducedMotion, router]);

  const flushPendingNavigation = useCallback(() => {
    const destination = pendingNavigationRef.current;
    if (!destination) return;
    pendingNavigationRef.current = null;
    if (destination === "__back__") {
      router.back();
      return;
    }
    router.push(destination);
  }, [router]);

  const navigateAfterClose = useCallback(
    (destination: string) => {
      if (presentation === "page") {
        router.push(destination);
        return;
      }
      pendingNavigationRef.current = destination;
      setOpen(false);
      if (reducedMotion) {
        window.requestAnimationFrame(flushPendingNavigation);
      }
    },
    [flushPendingNavigation, presentation, reducedMotion, router],
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
      setExisting(null);
      const response = await createRiskCharter(token, {
        title: normalizedTitle,
        organizationId: user.organizationId,
        uprLevel,
        period: currentFiscalYear(),
      });
      if (response.existing) {
        setExisting(response.data);
        return;
      }

      navigateAfterClose(`/management/charters/${response.data.id}`);
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
    navigateAfterClose,
    title,
    token,
    uprLevel,
    user?.organizationId,
  ]);

  const content = (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        void handleCreate();
      }}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="charter-title">Judul Piagam</Label>
        <Input
          id="charter-title"
          autoFocus
          maxLength={120}
          value={title}
          onChange={(event) => {
            setTitle(event.target.value);
            if (error) setError(null);
            if (existing) setExisting(null);
          }}
          placeholder="Contoh: Piagam Manajemen Risiko Direktorat 2026"
          aria-invalid={Boolean(error)}
          aria-describedby={error ? "charter-create-error" : undefined}
        />
        <FieldErrorMessage
          id="charter-create-error"
          className="text-sm font-normal"
        >
          {error}
        </FieldErrorMessage>
      </div>

      {existing ? (
        <div className="space-y-3">
          <CollectionNotice>
            {existing.status === "draft"
              ? "Piagam tahun berjalan sudah memiliki draf."
              : "Piagam tahun berjalan sudah tersedia."}
          </CollectionNotice>
          <AccentButton
            type="button"
            className="w-full justify-center"
            icon={<ArrowRight className="size-4" />}
            onClick={() =>
              navigateAfterClose(`/management/charters/${existing.id}`)
            }
          >
            {existing.status === "draft" ? "Lanjutkan draf" : "Buka Piagam"}
          </AccentButton>
        </div>
      ) : null}
    </form>
  );

  if (presentation === "page") {
    return (
      <FormPage>
        <FormHeader
          title="Buat Piagam"
          subtitle="Beri judul untuk membuat draf Piagam tahun berjalan."
        />
        <Card className="mx-auto w-full max-w-xl rounded-lg">
          <CardContent className="space-y-5 p-6">
            <div className="flex size-10 items-center justify-center rounded-lg bg-muted text-foreground">
              <FilePlus2 className="size-5" />
            </div>
            {content}
            {!existing ? (
              <LoadingActionButton
                className="w-full"
                variant="primary"
                size="primary"
                loading={submitting || loadingContext}
                loadingLabel={loadingContext ? "Menyiapkan..." : "Membuat draf..."}
                disabled={!title.trim() || Boolean(error && !uprLevel)}
                onClick={() => void handleCreate()}
              >
                Buat draf
              </LoadingActionButton>
            ) : null}
          </CardContent>
        </Card>
      </FormPage>
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen && !pendingNavigationRef.current) close();
      }}
    >
      <DialogContent
        className="max-w-2xl no-scrollbar"
        showCloseButton={false}
        onAnimationEnd={(event) => {
          if (event.currentTarget !== event.target) return;
          if (event.animationName !== "exit") return;
          flushPendingNavigation();
        }}
      >
        <div className="flex min-h-0 flex-col gap-5">
          <DialogHeader>
            <DialogTitle className="text-base">Buat Piagam</DialogTitle>
            <DialogDescription>
              Beri judul untuk membuat draf Piagam tahun berjalan.
            </DialogDescription>
          </DialogHeader>
          <div>{content}</div>
          <DialogFooter>
            <CollectionDialogCancel
              type="button"
              variant="outline"
              size="md"
              className="border-0 smooth-shadow-ring-xs shadow-black smooth-ring-neutral-300/30"
              onClick={close}
            >
              Batal
            </CollectionDialogCancel>
            {!existing ? (
              <LoadingActionButton
                type="button"
                variant="primary"
                size="primary"
                loading={submitting || loadingContext}
                loadingLabel={loadingContext ? "Menyiapkan..." : "Membuat draf..."}
                disabled={!title.trim() || Boolean(error && !uprLevel)}
                onClick={() => void handleCreate()}
              >
                Buat draf
              </LoadingActionButton>
            ) : null}
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
