"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Plus, Save } from "lucide-react";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/dom/sortable";

import { useAuth } from "@/contexts/auth-context";
import { fetchForm, updateForm, fetchFormAnalytics } from "@/lib/api/forms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormHeader } from "@/components/shared/form-shell";
import { SortableSection } from "@/components/form-builder/sortable-section";
import { FieldConfigPanel } from "@/components/form-builder/field-config-panel";
import {
  useFormBuilder,
  serializeFormState,
  deserializeForm,
} from "@/components/form-builder/use-form-builder";
import type { TargetAudience } from "@/types/form";

export default function EditFormPage() {
  const router = useRouter();
  const params = useParams();
  const formId = params.id as string;
  const { token } = useAuth();
  const [state, dispatch] = useFormBuilder();
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  const generateId = useCallback(() => uuidv4(), []);

  useEffect(() => {
    if (!token || !formId) return;

    let cancelled = false;

    async function load() {
      try {
        const [form, analytics] = await Promise.all([
          fetchForm(formId, token!),
          fetchFormAnalytics(formId, token!).catch(() => null),
        ]);

        if (cancelled) return;

        const builderState = deserializeForm(form);
        dispatch({ type: "LOAD_FORM", payload: builderState });

        if (analytics && analytics.totalResponses > 0) {
          setLocked(true);
        }
      } catch (err: unknown) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Gagal memuat formulir.";
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [token, formId, dispatch]);

  const selectedField = useMemo(() => {
    if (!state.selectedFieldId) return null;
    for (const section of state.sections) {
      for (const field of section.fields) {
        if (field.id === state.selectedFieldId) {
          return { field, sectionId: section.id };
        }
      }
    }
    return null;
  }, [state.selectedFieldId, state.sections]);

  const totalFields = useMemo(
    () => state.sections.reduce((acc, s) => acc + s.fields.length, 0),
    [state.sections],
  );

  const handleSectionDragEnd = useCallback(
    (event: { canceled: boolean; operation: { source: { id: unknown; index?: number; initialIndex?: number } | null; target: { id: unknown; index?: number } | null } }) => {
      if (event.canceled) return;
      const { source, target } = event.operation;
      if (!source || !target) return;
      if (!isSortable(source as never) || !isSortable(target as never)) return;
      const from = (source as unknown as { initialIndex: number }).initialIndex;
      const to = (target as unknown as { index: number }).index;
      if (from === to) return;
      dispatch({
        type: "REORDER_SECTIONS",
        payload: { fromIndex: from, toIndex: to },
      });
    },
    [dispatch],
  );

  const handleSave = async () => {
    if (!state.title.trim()) {
      toast.error("Judul formulir wajib diisi.");
      return;
    }
    if (state.sections.length === 0) {
      toast.error("Tambahkan minimal satu bagian.");
      return;
    }

    dispatch({ type: "SET_SUBMITTING", payload: true });
    try {
      const payload = serializeFormState(state);
      await updateForm(formId, payload, token ?? "");
      dispatch({ type: "MARK_CLEAN" });
      toast.success("Formulir berhasil diperbarui.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gagal memperbarui formulir.";
      toast.error(message);
    } finally {
      dispatch({ type: "SET_SUBMITTING", payload: false });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">
          Memuat formulir...
        </span>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-20">
      <FormHeader
        title="Form Builder"
        description={
          locked
            ? "Formulir ini sudah memiliki respons dan tidak dapat diedit."
            : "Edit struktur dan konfigurasi formulir."
        }
        badges={
          <>
            <Badge
              variant="outline"
              className="border-primary/15 bg-primary/[0.04] text-primary"
            >
              Edit
            </Badge>
            <Badge variant="outline" className="border-border/15 bg-muted/40 text-muted-foreground">
              {state.sections.length} bagian · {totalFields} field
            </Badge>
            {locked && (
              <Badge
                variant="outline"
                className="border-destructive/20 bg-destructive/5 text-destructive"
              >
                Terkunci
              </Badge>
            )}
          </>
        }
        backLabel="Kembali ke daftar formulir"
        onBack={() => router.push("/admin/forms")}
        actions={
          !locked ? (
            <Button
              className="gap-2 text-xs"
              onClick={handleSave}
              disabled={state.isSubmitting}
            >
              {state.isSubmitting ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Save className="size-3.5" />
              )}
              Simpan Perubahan
            </Button>
          ) : undefined
        }
      />

      {locked && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertTriangle className="size-5 shrink-0 text-destructive" />
          <div>
            <p className="text-sm font-medium text-destructive">
              Formulir terkunci
            </p>
            <p className="text-xs text-destructive/80">
              Formulir ini sudah memiliki respons dan tidak dapat diedit. Buat
              formulir baru jika Anda membutuhkan perubahan.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1 space-y-6">
          <div className="space-y-4 rounded-2xl border border-border/20 bg-card p-5">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Judul Formulir<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                value={state.title}
                onChange={(e) =>
                  dispatch({ type: "SET_TITLE", payload: e.target.value })
                }
                placeholder="Contoh: Survei Kepuasan Pelayanan"
                className="text-base"
                disabled={locked}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Deskripsi</Label>
              <Textarea
                value={state.description}
                onChange={(e) =>
                  dispatch({
                    type: "SET_DESCRIPTION",
                    payload: e.target.value,
                  })
                }
                placeholder="Deskripsi singkat tentang tujuan formulir ini (opsional)"
                className="min-h-[80px] resize-none text-sm"
                disabled={locked}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Target Audiens</Label>
                <Select
                  value={state.targetAudience}
                  onValueChange={(val) =>
                    dispatch({
                      type: "SET_TARGET_AUDIENCE",
                      payload: val as TargetAudience,
                    })
                  }
                  disabled={locked}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">Semua Unit</SelectItem>
                      <SelectItem value="specific">Unit Tertentu</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              {state.targetAudience === "specific" && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    ID Organisasi (pisahkan dengan koma)
                  </Label>
                  <Input
                    value={state.organizationIds.join(", ")}
                    onChange={(e) =>
                      dispatch({
                        type: "SET_ORG_IDS",
                        payload: e.target.value
                          .split(",")
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    placeholder="uuid-1, uuid-2"
                    className="text-sm"
                    disabled={locked}
                  />
                </div>
              )}
            </div>
          </div>

          <DragDropProvider onDragEnd={handleSectionDragEnd}>
            {state.sections.map((section, idx) => (
              <SortableSection
                key={section.id}
                section={section}
                sectionIndex={idx}
                selectedFieldId={state.selectedFieldId}
                disabled={locked}
                dispatch={dispatch}
                generateId={generateId}
              />
            ))}
          </DragDropProvider>

          {!locked && (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 border-dashed py-6 text-sm"
              onClick={() =>
                dispatch({
                  type: "ADD_SECTION",
                  payload: { id: generateId() },
                })
              }
            >
              <Plus className="size-4" />
              Tambah Bagian
            </Button>
          )}
        </div>

        {selectedField && !locked && (
          <div className="sticky top-20 hidden w-80 shrink-0 overflow-hidden rounded-2xl border border-border/20 bg-card lg:block">
            <FieldConfigPanel
              field={selectedField.field}
              sectionId={selectedField.sectionId}
              sections={state.sections}
              dispatch={dispatch}
              onClose={() =>
                dispatch({ type: "SELECT_FIELD", payload: null })
              }
            />
          </div>
        )}
      </div>
    </div>
  );
}
