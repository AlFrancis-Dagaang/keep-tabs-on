import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Kinsenas",
  description: "Track your money across every account.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
