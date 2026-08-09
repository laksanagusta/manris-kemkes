import type { ReactNode } from "react";

import { AccentButton } from "@/components/shared/design-system";

export function AccentButtonExample({
  children,
  icon,
}: {
  children: ReactNode;
  icon?: ReactNode;
}) {
  return <AccentButton icon={icon}>{children}</AccentButton>;
}
