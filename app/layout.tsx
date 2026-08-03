import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MRC Deadline Tracker — What's due next",
  description: "A shared, tamper-evident deadline tracker for MRC students.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          // Applies saved theme before paint to avoid a light/dark flash.
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('mrc-theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
