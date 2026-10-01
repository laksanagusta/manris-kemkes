import type { ReactNode } from "react";
import { DocumentationShell } from "@/components/documentation/documentation-shell";

export default function DocumentationLayout({ children }: { children: ReactNode }) {
  return <DocumentationShell>{children}</DocumentationShell>;
}
