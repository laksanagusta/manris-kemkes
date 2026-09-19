import type { ReactNode } from "react";

import { AccentButton } from "@/components/shared/design-system";

export function AccentButtonExample({
  children,
}: {
  children: ReactNode;
}) {
  return <AccentButton>{children}</AccentButton>;
}
