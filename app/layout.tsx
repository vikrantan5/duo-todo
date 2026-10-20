import "./globals.css";
import type { Metadata } from "next";
import { Toaster } from "sonner";

export const metadata: Metadata = {
  title: "Duo Todo — Shared Accountability",
  description: "A real-time two-person productivity & accountability platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="grain">
        {children}
        <Toaster theme="dark" position="top-right" />
      </body>
    </html>
  );
}
