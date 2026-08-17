import type { Metadata, Viewport } from "next";
import { Geist, Inter } from "next/font/google";
import { ToastProvider } from "./components/Toast";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Interviewer — Realistic mock interviews",
  description:
    "Practice with a live AI interviewer tuned to your resume and target role. Technical and behavioral rounds, real follow-ups, and a graded report.",
};

export const viewport: Viewport = {
  themeColor: "#131313",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-on-surface font-body text-body-md selection:bg-primary-fixed selection:text-on-primary-fixed">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
