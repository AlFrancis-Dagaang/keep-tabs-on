import type { Metadata } from "next";
import { Instrument_Sans, Source_Serif_4 } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument-sans" });
const serif = Source_Serif_4({ subsets: ["latin"], weight: "500", variable: "--font-source-serif" });

export const metadata: Metadata = {
  title: "Keep tabs on",
  description: "Track your money across every account.",
  icons: { apple: "/apple-icon.png" },
  appleWebApp: { capable: true, title: "Keep tabs on" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // next-themes sets the theme class on <html> before hydration
    <html lang="en" className={`h-full antialiased ${sans.variable} ${serif.variable}`} suppressHydrationWarning>
      <body className="min-h-full">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
