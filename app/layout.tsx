import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "next-auth/react";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "Project X-Ray | AI Product Fragility Checks",
  description: "Automated fragility checks for AI-built products before launch. Zero-backend analysis through the GitHub API.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased dark`}
      // Suppress hydration warnings caused by browser extensions that inject
      // attributes into <body> or <html>.
      suppressHydrationWarning
    >
      <body 
        className="min-h-full flex flex-col bg-[#0a0a0a] text-white"
        suppressHydrationWarning
      >
        <SessionProvider>
          <TooltipProvider>
            {children}
            <Toaster position="top-center" richColors closeButton />
          </TooltipProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
