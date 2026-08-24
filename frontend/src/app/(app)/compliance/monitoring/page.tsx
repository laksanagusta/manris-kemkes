import { MonitoringOperationalPanel } from "../_components/monitoring-operational-panel";
import { MonitoringLatestProgressChart } from "../_components/monitoring-latest-progress-chart";
import {
  CollectionPageHeader,
  PageStack,
} from "@/components/shared/design-system";

export default function MonitoringPage() {
  return (
    <PageStack>
      <CollectionPageHeader
        title="Monitoring"
        description="Pantau kewajiban monitoring risiko dan progres organisasi."
      />
      <MonitoringLatestProgressChart />
      <MonitoringOperationalPanel />
    </PageStack>
  );
}
