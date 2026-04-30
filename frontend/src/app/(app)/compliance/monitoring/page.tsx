import { MonitoringReportingWorkspace } from "../_components/monitoring-reporting-workspace";
import { MonitoringOperationalPanel } from "../_components/monitoring-operational-panel";

export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      <MonitoringReportingWorkspace />
      <MonitoringOperationalPanel />
    </div>
  );
}
