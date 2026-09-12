import "./globals.css";
import type { Metadata } from "next";
import { LanguageProvider } from "@/components/language-context";
import { ThemeProvider } from "@/components/theme-context";

export const metadata: Metadata = {
  title: "Restaurant Growth OS",
  description: "Restaurant customer retention SaaS",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <LanguageProvider>
            {children}
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
