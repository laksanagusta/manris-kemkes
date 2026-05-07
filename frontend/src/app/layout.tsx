import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { SuppressRadixWarnings } from "@/components/suppress-radix-warnings";
import "./globals.css";

const fontVariables = {
  "--font-sans":
    '"Manrope", "DM Sans", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--font-display":
    '"DM Sans", "Manrope", ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--font-mono":
    '"Geist Mono", ui-monospace, "SFMono-Regular", "SF Mono", Consolas, "Liberation Mono", monospace',
} as CSSProperties;

export const metadata: Metadata = {
  title: "Manris",
  description:
    "Platform SaaS untuk mendigitalisasi seluruh siklus manajemen risiko dan pelaporan insiden berbasis ISO 31000:2018 dengan integrasi kecerdasan buatan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" style={fontVariables}>
      <body className="antialiased">
        <AuthProvider>
          {children}
          <Toaster />
          <SuppressRadixWarnings />
        </AuthProvider>
      </body>
    </html>
  );
}
