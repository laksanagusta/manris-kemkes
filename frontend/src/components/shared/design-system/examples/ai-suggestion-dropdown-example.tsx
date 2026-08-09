import { AiSuggestionDropdown } from "@/components/shared/design-system";

const suggestions = [
  {
    id: "supply-delay",
    title: "Keterlambatan pengiriman bahan baku",
    description: "Risiko keterlambatan pasokan dari vendor utama yang dapat mengganggu jadwal produksi.",
  },
  {
    id: "system-outage",
    title: "Gangguan sistem informasi",
    description: "Potensi downtime sistem ERP yang dapat mengganggu operasional harian.",
  },
  {
    id: "regulatory-change",
    title: "Ketidakpatuhan regulasi baru",
    description: "Perubahan regulasi yang belum diantisipasi dapat menyebabkan sanksi administratif.",
  },
];

export function AiSuggestionDropdownExample() {
  return (
    <AiSuggestionDropdown
      label="Saran AI untuk judul risiko"
      suggestions={suggestions}
      onSelect={() => undefined}
    />
  );
}
