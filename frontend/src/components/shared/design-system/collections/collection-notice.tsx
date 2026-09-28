import type { ReactNode } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";

export function CollectionNotice({ icon, children, className }: {
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Alert className={className}>
      {icon}
      <AlertDescription>{children}</AlertDescription>
    </Alert>
  );
}
