import { useId, type ReactNode } from "react";
import { EditableInsetItems } from "@/components/shared/editable-inset-items";
import type { EditableItem } from "@/components/shared/editable-items-table";
import { PopoverSelectField } from "@/components/shared/design-system/fields/popover-select-field";
import { Sparkles } from "@/components/shared/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { riskCategoryLabels } from "@/lib/risk";

export const description = "Tentukan konteks risiko, penyebab utama, dan dampak yang paling relevan.";

type TextField = "title" | "description" | "owner" | "category" | "source" | "control";
type ListField = "causes" | "impacts";

export type Draft = Record<TextField, string> & Record<ListField, EditableItem[]>;
export type IdentificationFields = Record<keyof Draft, ReactNode>;

export const sample: Draft = {
  title: "Distribusi obat terlambat",
  description: "",
  owner: "ratna",
  category: "operasional",
  source: "",
  control: "",
  causes: [{ id: "cause-1", text: "Jadwal pengiriman belum dikonfirmasi oleh penyedia." }],
  impacts: [{ id: "impact-1", text: "Puskesmas kehabisan stok sebelum pengiriman berikutnya." }],
};

const categories = Object.entries(riskCategoryLabels)
  .filter(([value]) => value)
  .map(([value, label]) => ({ value, label }));

const owners = [
  { value: "", label: "Kosongkan pemilik risiko" },
  { value: "ratna", label: "Ratna Wulandari" },
  { value: "andi", label: "Andi Pratama" },
  { value: "sari", label: "Sari Utami" },
];

const sources = ["Internal", "External", "External & Internal"].map(label => ({ value: label, label }));
const controlLevels = [
  { value: "C", label: "Controllable" },
  { value: "UC", label: "Uncontrollable" },
];

const listLabels = {
  causes: { label: "Sebab", help: "Tambahkan satu penyebab per entri. Fokus pada pemicu kejadian.", example: "Permintaan pengiriman darurat belum masuk jadwal distribusi." },
  impacts: { label: "Dampak", help: "Tambahkan satu akibat per entri. Sebutkan layanan yang terganggu.", example: "Jadwal pelayanan pasien harus ditunda karena stok terbatas." },
};

export function useIdentificationFields(
  draft: Draft,
  update?: <K extends keyof Draft>(key: K, value: Draft[K]) => void,
): IdentificationFields {
  const prefix = useId();
  const locked = !update;
  const lockedControl = "disabled:!bg-disabled-input-surface disabled:!text-disabled-foreground disabled:!opacity-100";

  function field(key: TextField, label: string, required: boolean, render: (id: string, helpId?: string) => ReactNode, help?: string, action?: ReactNode) {
    const id = `${prefix}-${key}`;
    const helpId = help ? `${id}-help` : undefined;
    return (
      <div className="grid min-w-0 content-start gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="grid gap-0.5">
            <Label htmlFor={id}>{label}{required && <span className="text-destructive">*</span>}</Label>
            {help && <p id={helpId} className="text-xs leading-4 text-muted-foreground">{help}</p>}
          </div>
          {!locked && action}
        </div>
        {render(id, helpId)}
      </div>
    );
  }

  function select(key: TextField, label: string, placeholder: string, options: readonly { value: string; label: string }[], help?: string) {
    return field(key, label, key !== "owner", (id, helpId) => (
      <PopoverSelectField
        id={id}
        aria-describedby={helpId}
        options={options}
        disabled={locked}
        triggerClassName={lockedControl}
        value={draft[key] || undefined}
        onValueChange={value => update?.(key, value)}
        placeholder={placeholder}
      />
    ), help);
  }

  function list(key: ListField) {
    const { label, help, example } = listLabels[key];
    const helpId = `${prefix}-${key}-help`;
    return (
      <EditableInsetItems
        itemLabel={label}
        aria-describedby={helpId}
        items={draft[key]}
        disabled={locked}
        onChange={items => update?.(key, items)}
        header={<div className="space-y-0.5"><p className="text-sm font-medium">{label} <span className="text-destructive">*</span></p><p id={helpId} className="text-xs leading-4 text-muted-foreground">{help}</p></div>}
        emptyMessage={`Belum ada ${label.toLowerCase()}`}
        beforeAdd={<Button type="button" variant="ghost" size="icon-sm" aria-label={`Masukkan contoh ${label.toLowerCase()}`} title={`Masukkan contoh ${label.toLowerCase()}`} disabled={draft[key].some(item => item.text === example)} onClick={() => update?.(key, [...draft[key], { id: crypto.randomUUID(), text: example }])}><Sparkles aria-hidden="true" /></Button>}
      />
    );
  }

  return {
    title: field("title", "Risiko", true, (id, helpId) => <Input id={id} required disabled={locked} className={lockedControl} aria-describedby={helpId} value={draft.title} onChange={event => update?.("title", event.target.value)} placeholder="Masukkan nama risiko" />,
      "Tulis singkat kejadian yang mungkin terjadi, misalnya “Distribusi obat terlambat”.",
      <Button type="button" variant="ghost" size="icon-sm" disabled={Boolean(draft.title.trim())} aria-label="Isi contoh nama risiko" title="Isi contoh nama risiko" onClick={() => update?.("title", sample.title)}><Sparkles aria-hidden="true" /></Button>),
    description: field("description", "Deskripsi Kejadian Risiko", false, (id, helpId) => <Textarea id={id} rows={locked ? 2 : 3} disabled={locked} className={lockedControl} aria-describedby={helpId} value={draft.description} onChange={event => update?.("description", event.target.value)} />,
      "Opsional. Jelaskan proses yang terpengaruh dan kapan kejadian dapat terjadi."),
    owner: select("owner", "Pemilik Risiko", "Pilih pemilik risiko", owners),
    category: select("category", "Kategori Risiko", "Pilih kategori risiko", categories),
    source: select("source", "Sumber Risiko", "Pilih sumber risiko", sources),
    control: select("control", "Tingkat Kendali", "Pilih tingkat kendali", controlLevels, "Pilih Controllable jika unit dapat memengaruhi penyebab risiko."),
    causes: list("causes"),
    impacts: list("impacts"),
  };
}
