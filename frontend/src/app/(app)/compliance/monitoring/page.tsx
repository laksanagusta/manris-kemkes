import { OperatorWorkRouteBoundary } from "@/components/operator-work/workspace";
import { MonitoringReadOnlyWorkspace } from "../_components/monitoring-read-only-workspace";
import {
  CollectionPageHeader,
  PageStack,
} from "@/components/shared/design-system";

export default function MonitoringPage() {
  return (
    <OperatorWorkRouteBoundary section="monitoring"><PageStack>
      <CollectionPageHeader
        title="Pemantauan"
      />
      <MonitoringReadOnlyWorkspace />
    </PageStack></OperatorWorkRouteBoundary>
  );
}
