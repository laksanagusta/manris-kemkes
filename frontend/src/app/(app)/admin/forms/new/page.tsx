"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { toast } from "sonner";
import { Loader2, Plus, Save } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { createForm } from "@/lib/api/forms";
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
import { SectionCard } from "@/components/form-builder/section-card";
import { FieldConfigPanel } from "@/components/form-builder/field-config-panel";
import {
  useFormBuilder,
  serializeFormState,
} from "@/components/form-builder/use-form-builder";
import type { TargetAudience } from "@/types/form";

export default function NewFormPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [state, dispatch] = useFormBuilder();

  const generateId = useCallback(() => uuidv4(), []);

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
      const result = await createForm(payload, token ?? "");
      toast.success("Formulir berhasil disimpan.");
      router.push(`/admin/forms/${result.id}/edit`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Gagal menyimpan formulir.";
      toast.error(message);
    } finally {
      dispatch({ type: "SET_SUBMITTING", payload: false });
    }
  };

  return (
    <div className="animate-fade-in pb-20">
      <FormHeader
        title="Form Builder"
        description="Rancang formulir baru dengan bagian-bagian dan field yang dapat dikonfigurasi."
        badges={
          <>
            <Badge
              variant="outline"
              className="border-primary/15 bg-primary/[0.04] text-primary"
            >
              Baru
            </Badge>
            <Badge variant="outline" className="border-border/15 bg-muted/40 text-muted-foreground">
              {state.sections.length} bagian · {totalFields} field
            </Badge>
          </>
        }
        backLabel="Kembali ke daftar formulir"
        onBack={() => router.push("/admin/forms")}
        actions={
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
            Simpan Draft
          </Button>
        }
      />

      <div className="flex items-start gap-6">
        <div className="min-w-0 flex-1 space-y-6">
          <div className="space-y-4 rounded-2xl border border-border/20 bg-card p-5">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Judul Formulir <span className="text-destructive">*</span>
              </Label>
              <Input
                value={state.title}
                onChange={(e) =>
                  dispatch({ type: "SET_TITLE", payload: e.target.value })
                }
                placeholder="Contoh: Survei Kepuasan Pelayanan"
                className="text-base"
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
                  />
                </div>
              )}
            </div>
          </div>

          {state.sections.map((section, idx) => (
            <SectionCard
              key={section.id}
              section={section}
              sectionIndex={idx}
              selectedFieldId={state.selectedFieldId}
              dispatch={dispatch}
              generateId={generateId}
            />
          ))}

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
        </div>

        {selectedField && (
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
