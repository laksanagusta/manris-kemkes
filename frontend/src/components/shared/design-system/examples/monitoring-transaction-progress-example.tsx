import { MonitoringTransactionProgress } from "@/components/shared/design-system";

export function MonitoringTransactionProgressExample() {
  return (
    <div className="flex flex-wrap items-center gap-6">
      <MonitoringTransactionProgress
        data={{ q1: "final", q2: "draft" }}
      />
      <MonitoringTransactionProgress
        data={{ q1: "final", q2: "final", q3: "draft" }}
      />
      <MonitoringTransactionProgress
        items={[
          { label: "Ketua", status: "final" },
          { label: "Reviewer", status: "draft" },
        ]}
        countLabel="TTE"
        ariaLabelOverride="Progres TTE: 1 dari 2 penandatangan sudah menandatangani."
      />
      <MonitoringTransactionProgress />
    </div>
  );
}
