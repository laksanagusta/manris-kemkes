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
      <MonitoringTransactionProgress />
    </div>
  );
}
