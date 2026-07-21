import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { Poppins } from "next/font/google";
import { Toaster } from "sonner";
import { SidebarProvider } from "@/components/sidebar-context";
import { ThemeProvider } from "next-themes";
import { NEXT_PUBLIC_CLINIC_NAME, NEXT_PUBLIC_CLINIC_TAGLINE, NEXT_PUBLIC_LOGO_URL, NEXT_PUBLIC_THEME_COLOR } from "@/constants/ClinicDetails";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

const CLINIC_NAME = NEXT_PUBLIC_CLINIC_NAME || "ClinicHMS";
const CLINIC_TAGLINE = NEXT_PUBLIC_CLINIC_TAGLINE || "Hospital Management System";
const LOGO_URL = NEXT_PUBLIC_LOGO_URL || "";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: {
    template: `%s | ${CLINIC_NAME}`,
    default: `${CLINIC_NAME} — ${CLINIC_TAGLINE}`,
  },
  description: CLINIC_TAGLINE,
  applicationName: CLINIC_NAME,
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: CLINIC_NAME,
  },
  themeColor: NEXT_PUBLIC_THEME_COLOR,
  robots: "noindex, nofollow",
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable}>
      <head>
         {LOGO_URL && <link rel="icon" href={LOGO_URL} />}
        {LOGO_URL && <link rel="shortcut icon" href={LOGO_URL} />}
        {LOGO_URL && <link rel="apple-touch-icon" href={LOGO_URL} />}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content={CLINIC_NAME} />
        <meta name="theme-color" content={NEXT_PUBLIC_THEME_COLOR} />
        <script dangerouslySetInnerHTML={{
          __html: `
    (function() {
      try {
        if (localStorage.getItem("theme") === "dark") {
          document.documentElement.classList.add("dark");
        }
      } catch (e) {}
    })();
  `,
        }} />
      </head>
      <body className="antialiased">
        <RegisterServiceWorker />
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