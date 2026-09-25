import type { Metadata } from "next";
import { Agentation } from "agentation";
import { Inter } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { SuppressRadixWarnings } from "@/components/suppress-radix-warnings";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

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
    <html lang="id" className={cn("font-sans", inter.variable)}>
      <body className="bg-background antialiased">
        <AuthProvider>
          {children}
          <Toaster />
          <SuppressRadixWarnings />
          {process.env.NODE_ENV === "development" && <Agentation />}
        </AuthProvider>
      </body>
    </html>
  );
}
