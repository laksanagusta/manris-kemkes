import { MitigationMonitoringPanel } from "../_components/mitigation-monitoring-panel";
import {
  CollectionPageHeader,
  PageStack,
} from "@/components/shared/design-system";

export default function PenangananPage() {
  return (
    <PageStack>
      <CollectionPageHeader
        title="Penanganan"
      />
      <MitigationMonitoringPanel />
    </PageStack>
  );
}
