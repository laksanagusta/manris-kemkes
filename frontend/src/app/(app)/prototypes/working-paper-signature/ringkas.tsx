import { CheckCircle2 } from "@/components/shared/icons";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { archiveDescription, completionTitle, lockDescription } from "./copy";

export function Ringkas() {
  return (
    <Alert variant="success" role="status" className="items-start gap-y-1">
      <CheckCircle2 aria-hidden="true" />
      <AlertTitle>{completionTitle}</AlertTitle>
      <AlertDescription>
        {archiveDescription} {lockDescription}
      </AlertDescription>
    </Alert>
  );
}
