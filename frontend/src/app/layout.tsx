import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Agentation } from "agentation";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { SuppressRadixWarnings } from "@/components/suppress-radix-warnings";
import { SmoothCorners } from "@/components/smooth-corners";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const fontVariables = {
  "--font-sans":
    "var(--font-inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "--font-display":
    "var(--font-inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "--font-logo":
    "var(--font-inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  "--font-mono":
    "var(--font-inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
} as CSSProperties;

export const metadata: Metadata = {
  title: "Manris",
  description:
    "Platform SaaS untuk mendigitalisasi seluruh siklus manajemen risiko dan pelaporan insiden berbasis ISO 31000:2018 dengan integrasi kecerdasan buatan.",
  icons: {
    icon: {
      url: "/icon.svg",
      type: "image/svg+xml",
    },
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
      className={`${inter.variable} border-shadow`}
    >
      <body className="bg-background antialiased">
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
