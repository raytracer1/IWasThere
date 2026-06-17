import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Navbar } from "@/components/Navbar";
import { SessionProviderWrapper } from "@/components/SessionProviderWrapper";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "IfIWasThere — Step into historic moments",
  description:
    "Upload your selfie and see yourself at history's greatest sports moments. AI-powered sports imagination. Free.",
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
    >
      <body className="min-h-full bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex flex-col">
        <SessionProviderWrapper>
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
        </SessionProviderWrapper>
      </body>
    </html>
  );
}
