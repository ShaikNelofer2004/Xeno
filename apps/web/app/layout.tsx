import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "XenoCRM — AI Campaign Agent",
  description:
    "AI-native mini CRM for Brewhaus. Give the agent a goal, watch it run campaigns autonomously.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider afterSignOutUrl="/">
      <html lang="en" className={`${inter.variable} h-full`}>
        <body className="h-full antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
