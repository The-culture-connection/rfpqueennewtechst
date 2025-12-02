import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AnalyticsInitializer } from "@/components/AnalyticsInitializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RFP Matcher - Find Funding Opportunities",
  description: "Match your organization with the best grants, RFPs, and government contracts based on your profile and win rate.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AnalyticsInitializer />
        <AuthProvider>
        {children}
        </AuthProvider>
      </body>
    </html>
  );
}
