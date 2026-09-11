import {
  LabeledList,
  LabeledListItem,
} from "@/components/shared/design-system";

export function LabeledListExample() {
  return (
    <LabeledList label="Waktu & wilayah" className="max-w-2xl">
      <LabeledListItem title="Bulan pertama tahun fiskal" />
      <LabeledListItem title="Wilayah" />
    </LabeledList>
  );
}
