import { ProgressMeter } from "@/components/shared/design-system";

export function ProgressMeterExample() {
  return (
    <div className="flex flex-col gap-3">
      <ProgressMeter value={75} />
      <ProgressMeter value={100} />
      <ProgressMeter value={30} />
    </div>
  );
}
