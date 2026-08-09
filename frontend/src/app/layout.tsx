import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Agentation } from "agentation";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { SuppressRadixWarnings } from "@/components/suppress-radix-warnings";
import { SmoothCorners } from "@/components/smooth-corners";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

const fontVariables = {
  "--font-sans":
    "var(--font-jakarta-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "--font-display":
    "var(--font-jakarta-sans), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "--font-mono":
    "var(--font-jetbrains-mono), ui-monospace, 'SFMono-Regular', 'SF Mono', Consolas, 'Liberation Mono', monospace",
} as CSSProperties;

export const metadata: Metadata = {
  title: "Manris",
  description:
    "Platform SaaS untuk mendigitalisasi seluruh siklus manajemen risiko dan pelaporan insiden berbasis ISO 31000:2018 dengan integrasi kecerdasan buatan.",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      style={fontVariables}
      className={`${jakartaSans.variable} ${jetbrainsMono.variable}`}
    >
      <body className="antialiased">
        <AuthProvider>
          {children}
          <Toaster />
          <SuppressRadixWarnings />
          <SmoothCorners />
          {process.env.NODE_ENV === "development" && <Agentation />}
        </AuthProvider>
      </body>
    </html>
  );
}
