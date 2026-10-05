import type { Metadata } from "next";
import { Agentation } from "agentation";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { AppToaster } from "@/components/app-toaster";
import { MotionFeedback } from "@/components/shared/design-system/motion/motion-feedback";
import { SuppressRadixWarnings } from "@/components/suppress-radix-warnings";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title: "Manrisk",
  description:
    "Platform SaaS manajemen risiko",
  icons: {
    icon: {
      url: "/manrisk-favicon.svg",
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
    <html suppressHydrationWarning lang="id" className={cn("font-sans", inter.variable)}>
      <body className="bg-background antialiased">
        <ThemeProvider>
          <AuthProvider>
            {children}
            <AppToaster />
            <MotionFeedback />
            <SuppressRadixWarnings />
            {process.env.NODE_ENV === "development" && <Agentation />}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
