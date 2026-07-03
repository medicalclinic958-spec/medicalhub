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

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    template: "%s | ClinicHMS",
    default: "ClinicHMS — Hospital Management System",
  },
  description: "Internal clinic and hospital management system",
  robots: "noindex, nofollow",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  console.log("   📧 Email: admin@clinic.com");
  console.log("   🔑 Password: Admin@123456");
  return (
    <html lang="en" className={poppins.variable}>
      <body className="antialiased">
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
      </body>
    </html>
  );
}