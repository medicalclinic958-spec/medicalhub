import { auth } from "@/lib/auth/auth.config";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { SearchPalette } from "@/components/shared/search-palette";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar session={session} />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header session={session} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
      <SearchPalette />
    </div>
  );
}
