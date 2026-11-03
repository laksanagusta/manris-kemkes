import type { ReactNode } from "react";
import { PageStack } from "./page-stack";

/** Full-width page actions with a centered, readable task column. */
export function OperatorWorkLayout({
  header,
  children,
}: {
  header?: ReactNode;
  children: ReactNode;
}) {
  return (
    <PageStack>
      {header}
      <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6">
        {children}
      </div>
    </PageStack>
  );
}
