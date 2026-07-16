import dns from "dns/promises";

dns.setServers([
  "8.8.8.8",
  "8.8.4.4"
]);

import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Poppins } from "next/font/google";
import { Toaster } from "sonner";
import { SidebarProvider } from "@/components/sidebar-context";
import { ThemeProvider } from "next-themes";
import { NEXT_PUBLIC_CLINIC_NAME, NEXT_PUBLIC_CLINIC_TAGLINE, NEXT_PUBLIC_LOGO_URL } from "@/constants/ClinicDetails";

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

const CLINIC_NAME = NEXT_PUBLIC_CLINIC_NAME || "ClinicHMS";
const CLINIC_TAGLINE = NEXT_PUBLIC_CLINIC_TAGLINE || "Hospital Management System";
const LOGO_URL = NEXT_PUBLIC_LOGO_URL || "";

export const metadata: Metadata = {
  title: {
    template: `%s | ${CLINIC_NAME}`,
    default: `${CLINIC_NAME} — ${CLINIC_TAGLINE}`,
  },
  description: "Internal clinic and hospital management system",
  robots: "noindex, nofollow",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <head>
         {LOGO_URL && <link rel="icon" href={LOGO_URL} />}
        {LOGO_URL && <link rel="shortcut icon" href={LOGO_URL} />}
        {LOGO_URL && <link rel="apple-touch-icon" href={LOGO_URL} />}
        <script dangerouslySetInnerHTML={{
          __html: `
    (function() {
      if (localStorage.getItem("theme") === "dark") {
        document.documentElement.classList.add("dark");
      }
    })();
  `,
        }} />
      </head>
      <body className="antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <SidebarProvider>
            <Providers>{children}</Providers>
            <Toaster
              position="top-right"
              expand={false}
              richColors
              closeButton
              toastOptions={{
                style: {
                  background: '#0d9488',
                  color: '#ffffff',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '12px',
                  fontSize: '14px',
                },
              }}
            />
          </SidebarProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}