"use client";

import { useId, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useAuth } from "@/contexts/auth-context";
import type { OrganizationListItem } from "@/lib/api/organizations";
import { createRiskCharter } from "@/lib/api/risk-charters";
import type { RiskCharterUPRLevel } from "@/types/risk-charter";
import { Plus } from "@/components/shared/icons";
import {
  AccentButton,
  CollectionDialogCancel,
  FieldErrorMessage,
  Input,
  Label,
  LoadingActionButton,
} from "@/components/shared/design-system";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function normalizeUPRLevel(value?: string): RiskCharterUPRLevel | null {
  if (value === "kementerian" || value === "eksekutif") return "eksekutif";
  if (value === "upr_t1" || value === "upr_t2") return value;
  return null;
}

export function RiskCharterQuickCreate({
  organization,
}: {
  organization?: OrganizationListItem;
}) {
  const router = useRouter();
  const { token } = useAuth();
  const titleId = useId();
  const errorId = `${titleId}-error`;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const uprLevel = normalizeUPRLevel(organization?.uprLevel);
  const contextError = !organization
    ? "Organisasi aktif belum tersedia pada akun ini."
    : !uprLevel
      ? "Level UPR organisasi belum tersedia."
      : null;

  function handleOpenChange(nextOpen: boolean) {
    if (submitting) return;

    if (nextOpen) {
      setTitle("");
      setError(null);
    }
    setOpen(nextOpen);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedTitle = title.trim();
    if (submitting || !normalizedTitle || !token || !organization || !uprLevel) return;

    try {
      setSubmitting(true);
      setError(null);
      const response = await createRiskCharter(token, {
        title: normalizedTitle,
        organizationId: organization.id,
        uprLevel,
      });
      if (response.existing) {
        toast.info(
          response.data.status === "draft"
            ? "Membuka draf Piagam yang sudah ada."
            : "Membuka Piagam yang sudah ada.",
        );
      }

      setOpen(false);
      router.push(`/management/charters/${response.data.id}`);
    } catch (createError) {
      setError(
        createError instanceof Error
          ? createError.message
          : "Draf Piagam belum berhasil dibuat.",
      );
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <AccentButton type="button" disabled={submitting} icon={<Plus className="size-4" />}>
          Buat Piagam
        </AccentButton>
      </DialogTrigger>
      <DialogContent showCloseButton={!submitting}>
        <DialogHeader>
          <DialogTitle>Buat Piagam</DialogTitle>
          <DialogDescription>
            Masukkan judul untuk membuat draf. Isi piagam dapat dilengkapi di halaman detail.
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-6" onSubmit={handleCreate}>
          <div className="flex flex-col gap-2">
            <Label htmlFor={titleId}>Judul Piagam</Label>
            <Input
              id={titleId}
              className="bg-white dark:bg-white dark:text-neutral-900 dark:placeholder:text-neutral-500"
              maxLength={120}
              required
              readOnly={submitting}
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
                setError(null);
              }}
              placeholder="Contoh: Piagam Manajemen Risiko Direktorat"
              aria-describedby={contextError || error ? errorId : undefined}
            />
            <FieldErrorMessage id={errorId}>{contextError ?? error}</FieldErrorMessage>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <CollectionDialogCancel type="button" disabled={submitting}>
                Batal
              </CollectionDialogCancel>
            </DialogClose>
            <LoadingActionButton
              type="submit"
              variant="default"
              loading={submitting}
              loadingLabel="Membuat draf..."
              disabled={!title.trim() || !token || Boolean(contextError)}
            >
              Buat draf
            </LoadingActionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
