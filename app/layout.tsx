import dns from "dns";

dns.setServers([
  "8.8.8.8",
  "8.8.4.4"
]);

import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

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
    <html lang="en">
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
