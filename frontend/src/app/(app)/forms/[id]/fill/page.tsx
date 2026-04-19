"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2, Send, AlertTriangle, ShieldX, FileCheck } from "lucide-react";

import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { fetchForm, fetchFormResponses, submitResponse } from "@/lib/api/forms";
import type { Form, FormField, FormResponse, FormSection } from "@/types/form";
import { useConditionalVisibility } from "@/hooks/use-conditional-visibility";
import { FieldRenderer } from "@/components/form-builder/field-renderers";
import { FormHeader } from "@/components/shared/form-shell";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function flattenFields(sections: FormSection[]): FormField[] {
  return sections
    .sort((a, b) => a.position - b.position)
    .flatMap((s) => [...s.fields].sort((a, b) => a.position - b.position));
}

function buildDynamicSchema(
  fields: FormField[],
  visibleFieldIds: Set<string>,
) {
  const shape: Record<string, z.ZodType> = {};
  for (const field of fields) {
    if (!visibleFieldIds.has(field.id)) continue;
    if (field.fieldType === "checkbox") {
      shape[field.fieldKey] = field.isRequired
        ? z.array(z.string()).min(1, "Pilih minimal satu opsi")
        : z.array(z.string()).optional().default([]);
    } else {
      shape[field.fieldKey] = field.isRequired
        ? z.string().min(1, "Wajib diisi")
        : z.string().optional().default("");
    }
  }
  return z.object(shape);
}

function buildDefaultValues(fields: FormField[]): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};
  for (const field of fields) {
    defaults[field.fieldKey] =
      field.fieldType === "checkbox" ? [] : "";
  }
  return defaults;
}

type PageState =
  | { kind: "loading" }
  | { kind: "error"; message: string }
  | { kind: "forbidden" }
  | { kind: "not_published" }
  | { kind: "ready"; form: Form; existingResponse: FormResponse | null };

export default function FillFormPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { token, user } = useAuth();
  const [pageState, setPageState] = useState<PageState>({ kind: "loading" });

  useEffect(() => {
    if (!token || !user) return;
    let cancelled = false;

    async function load() {
      try {
        const [form, responses] = await Promise.all([
          fetchForm(params.id, token!),
          fetchFormResponses(params.id, token!).catch(() => [] as FormResponse[]),
        ]);

        if (cancelled) return;

        if (form.status !== "published") {
          setPageState({ kind: "not_published" });
          return;
        }

        const myResponse =
          responses.find((r) => r.respondentId === user!.id) ?? null;

        setPageState({ kind: "ready", form, existingResponse: myResponse });
      } catch (err) {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 403) {
          setPageState({ kind: "forbidden" });
        } else {
          setPageState({
            kind: "error",
            message:
              err instanceof Error ? err.message : "Gagal memuat formulir",
          });
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [params.id, token, user]);

  if (pageState.kind === "loading") {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-3 text-sm text-muted-foreground">
          Memuat formulir...
        </span>
      </div>
    );
  }

  if (pageState.kind === "forbidden") {
    return (
      <ErrorState
        icon={<ShieldX className="size-10 text-destructive" />}
        title="Akses Ditolak"
        message="Anda tidak memiliki akses ke form ini."
        onBack={() => router.push("/forms")}
      />
    );
  }

  if (pageState.kind === "not_published") {
    return (
      <ErrorState
        icon={<AlertTriangle className="size-10 text-warning" />}
        title="Form Belum Dipublikasi"
        message="Form ini belum dipublikasi dan tidak bisa diisi."
        onBack={() => router.push("/forms")}
      />
    );
  }

  if (pageState.kind === "error") {
    return (
      <ErrorState
        icon={<AlertTriangle className="size-10 text-destructive" />}
        title="Terjadi Kesalahan"
        message={pageState.message}
        onBack={() => router.push("/forms")}
      />
    );
  }

  const { form, existingResponse } = pageState;

  if (existingResponse) {
    return (
      <ReadOnlyView
        form={form}
        response={existingResponse}
        onBack={() => router.push("/forms")}
      />
    );
  }

  return <InteractiveForm form={form} />;
}

function ErrorState({
  icon,
  title,
  message,
  onBack,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-32">
      {icon}
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted-foreground">{message}</p>
      <Button variant="outline" onClick={onBack}>
        Kembali ke Daftar Form
      </Button>
    </div>
  );
}

function ReadOnlyView({
  form,
  response,
  onBack,
}: {
  form: Form;
  response: FormResponse;
  onBack: () => void;
}) {
  const allFields = useMemo(() => flattenFields(form.sections), [form]);
  const sortedSections = useMemo(
    () => [...form.sections].sort((a, b) => a.position - b.position),
    [form],
  );

  return (
    <div className="animate-fade-in pb-20">
      <FormHeader
        title={form.title}
        description={form.description ?? ""}
        badges={
          <Badge
            variant="outline"
            className="gap-1.5 border-success/30 bg-success/10 text-success"
          >
            <FileCheck className="size-3.5" />
            Sudah diisi
          </Badge>
        }
        backLabel="Kembali ke daftar form"
        onBack={onBack}
      />

      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {sortedSections.map((section) => {
          const sectionFields = allFields.filter(
            (f) => f.sectionId === section.id,
          );
          if (sectionFields.length === 0) return null;

          return (
            <Card key={section.id} className="border-border/20 bg-card">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  {section.title}
                </CardTitle>
                {section.description && (
                  <CardDescription>{section.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {sectionFields.map((field) => {
                  const savedValue = response.answers[field.fieldKey];
                  const displayValue =
                    savedValue ??
                    (field.fieldType === "checkbox" ? [] : "");
                  return (
                    <FieldRenderer
                      key={field.id}
                      field={field}
                      value={displayValue}
                      onChange={() => {}}
                      disabled
                    />
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function InteractiveForm({ form }: { form: Form }) {
  const router = useRouter();
  const { token } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string[]>
  >({});

  const allFields = useMemo(() => flattenFields(form.sections), [form]);
  const sortedSections = useMemo(
    () => [...form.sections].sort((a, b) => a.position - b.position),
    [form],
  );
  const defaultValues = useMemo(
    () => buildDefaultValues(allFields),
    [allFields],
  );

  const { setValue, control } = useForm({ defaultValues });

  const watchedValues = useWatch({ control }) as Record<string, unknown>;
  const visibleFieldIds = useConditionalVisibility(allFields, watchedValues);

  const schema = useMemo(
    () => buildDynamicSchema(allFields, visibleFieldIds),
    [allFields, visibleFieldIds],
  );

  useEffect(() => {
    for (const field of allFields) {
      if (!visibleFieldIds.has(field.id)) {
        const emptyVal = field.fieldType === "checkbox" ? [] : "";
        const current = watchedValues[field.fieldKey];
        const isEmpty = Array.isArray(current)
          ? current.length === 0
          : current === "";
        if (!isEmpty) {
          setValue(field.fieldKey, emptyVal);
        }
      }
    }
  }, [visibleFieldIds, allFields, setValue, watchedValues]);

  const onSubmit = useCallback(async () => {
    const parseResult = schema.safeParse(watchedValues);
    if (!parseResult.success) {
      const fieldErrors = parseResult.error.flatten().fieldErrors as Record<
        string,
        string[]
      >;
      setValidationErrors(fieldErrors);
      const firstErrorKey = Object.keys(fieldErrors)[0];
      if (firstErrorKey) {
        const field = allFields.find((f) => f.fieldKey === firstErrorKey);
        if (field) {
          document
            .getElementById(field.id)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
      toast.error(
        "Ada isian yang belum lengkap. Periksa field yang bertanda merah.",
      );
      return;
    }

    setValidationErrors({});

    const answers: Record<string, unknown> = {};
    for (const field of allFields) {
      if (visibleFieldIds.has(field.id)) {
        answers[field.fieldKey] = watchedValues[field.fieldKey];
      }
    }

    setIsSubmitting(true);
    try {
      await submitResponse(form.id, { answers }, token!);
      toast.success("Form berhasil disubmit");
      router.push("/forms");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        toast.error("Anda sudah mengisi form ini");
      } else {
        toast.error(
          err instanceof Error ? err.message : "Gagal mengirim jawaban",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  }, [
    schema,
    watchedValues,
    allFields,
    visibleFieldIds,
    form.id,
    token,
    router,
  ]);

  return (
    <div className="animate-fade-in pb-20">
      <FormHeader
        title={form.title}
        description={form.description ?? ""}
        badges={
          <Badge
            variant="outline"
            className="border-primary/15 bg-primary/[0.04] text-primary"
          >
            Formulir aktif
          </Badge>
        }
        backLabel="Kembali ke daftar form"
        onBack={() => router.push("/forms")}
      />

      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        {sortedSections.map((section) => {
          const sectionFields = allFields.filter(
            (f) => f.sectionId === section.id,
          );
          const visibleSectionFields = sectionFields.filter((f) =>
            visibleFieldIds.has(f.id),
          );
          if (visibleSectionFields.length === 0) return null;

          return (
            <Card key={section.id} className="border-border/20 bg-card">
              <CardHeader>
                <CardTitle className="text-base font-semibold">
                  {section.title}
                </CardTitle>
                {section.description && (
                  <CardDescription>{section.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                {visibleSectionFields.map((field) => (
                  <FieldRenderer
                    key={field.id}
                    field={field}
                    value={
                      watchedValues[field.fieldKey] ??
                      (field.fieldType === "checkbox" ? [] : "")
                    }
                    onChange={(v) => setValue(field.fieldKey, v)}
                    error={validationErrors[field.fieldKey]?.[0]}
                    disabled={isSubmitting}
                  />
                ))}
              </CardContent>
            </Card>
          );
        })}

        <div className="flex justify-end">
          <Button
            onClick={onSubmit}
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {isSubmitting ? "Mengirim..." : "Kirim Jawaban"}
          </Button>
        </div>
      </div>
    </div>
  );
}
