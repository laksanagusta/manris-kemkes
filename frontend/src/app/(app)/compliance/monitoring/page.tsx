import { MonitoringReportingWorkspace } from "../_components/monitoring-reporting-workspace";
import { MonitoringOperationalPanel } from "../_components/monitoring-operational-panel";
import { MonitoringLatestProgressChart } from "../_components/monitoring-latest-progress-chart";
import { PageStack } from "@/components/shared/design-system";

export default function MonitoringPage() {
  return (
    <PageStack>
      <MonitoringReportingWorkspace />
      <MonitoringLatestProgressChart />
      <MonitoringOperationalPanel />
    </PageStack>
  );
}
