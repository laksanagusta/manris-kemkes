import type { ReactNode } from "react";
import type { Metadata } from "next";
import { DocumentationShell } from "@/components/documentation/documentation-shell";

export const metadata: Metadata = {
  robots: { index: true, follow: true },
};

export default function DocumentationLayout({ children }: { children: ReactNode }) {
  return <DocumentationShell>{children}</DocumentationShell>;
}
