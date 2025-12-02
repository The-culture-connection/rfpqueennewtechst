import type { Metadata } from "next";
import { Inter, Orbitron } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";
import { AnalyticsInitializer } from "@/components/AnalyticsInitializer";

// Prevent static generation to avoid Firebase initialization during build
export const dynamic = 'force-dynamic';

const orbitron = Orbitron({ 
  subsets: ["latin"],
  variable: '--font-primary',
  display: 'swap',
});

const inter = Inter({ 
  subsets: ["latin"],
  variable: '--font-secondary',
  display: 'swap',
});

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
      <body className={`${orbitron.variable} ${inter.variable} font-secondary`}>
        <AnalyticsInitializer />
        <AuthProvider>
        {children}
        </AuthProvider>
      </body>
    </html>
  );
}
