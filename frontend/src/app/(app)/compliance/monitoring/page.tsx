import { MonitoringReadOnlyWorkspace } from "../_components/monitoring-read-only-workspace";
import {
  CollectionPageHeader,
  PageStack,
} from "@/components/shared/design-system";

export default function MonitoringPage() {
  return (
    <PageStack>
      <CollectionPageHeader
        title="Pemantauan"
      />
      <MonitoringReadOnlyWorkspace />
    </PageStack>
  );
}
