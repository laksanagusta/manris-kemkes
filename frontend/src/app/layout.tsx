import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/sonner";
import { SuppressRadixWarnings } from "@/components/suppress-radix-warnings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Polymer",
  description:
    "Platform SaaS untuk mendigitalisasi seluruh siklus manajemen risiko dan pelaporan insiden berbasis ISO 31000:2018 dengan integrasi kecerdasan buatan.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable}`}
    >
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
