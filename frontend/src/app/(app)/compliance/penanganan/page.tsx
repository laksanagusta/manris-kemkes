import { OperatorWorkReturnLink } from "@/components/operator-work/return-link";
import { OperatorWorkRouteBoundary } from "@/components/operator-work/workspace";
import { MitigationMonitoringPanel } from "../_components/mitigation-monitoring-panel";
import {
  CollectionPageHeader,
  PageStack,
} from "@/components/shared/design-system";

export default function PenangananPage() {
  return (
    <OperatorWorkRouteBoundary section="reports"><PageStack>
      <OperatorWorkReturnLink />
      <CollectionPageHeader
        title="Penanganan"
      />
      <MitigationMonitoringPanel />
    </PageStack></OperatorWorkRouteBoundary>
  );
}
