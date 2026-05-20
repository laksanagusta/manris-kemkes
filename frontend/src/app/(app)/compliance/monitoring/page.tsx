import { MonitoringReportingWorkspace } from "../_components/monitoring-reporting-workspace";
import { MonitoringOperationalPanel } from "../_components/monitoring-operational-panel";
import { MonitoringLatestProgressChart } from "../_components/monitoring-latest-progress-chart";

export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      <MonitoringReportingWorkspace />
      <MonitoringLatestProgressChart />
      <MonitoringOperationalPanel />
    </div>
  );
}
