"use client";

import { useState, useEffect } from "react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { LogOut, ChevronDown, UserCircle, Menu, Hospital, Sun, Moon, LifeBuoy } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NotificationsPanel } from "./notifications-panel";
import { DeveloperReportModal } from "./developer-report-modal";
import { useSidebar } from "../sidebar-context";
import { NEXT_PUBLIC_CLINIC_NAME, NEXT_PUBLIC_LOGO_URL } from "@/constants/ClinicDetails";

interface HeaderProps { session: Session }

export function Header({ session }: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { toggleMobile } = useSidebar();
  const canSendDeveloperReport =
    session.user.isSuperAdmin ||
    (session.user.permissions || []).includes("developer_reports:create");

  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark") {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  };

  return (
    <header className="min-h-14 bg-white border-b border-gray-200 shrink-0 z-10 px-4 sm:px-6 py-2">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <button
          onClick={toggleMobile}
          className="md:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 cursor-pointer shrink-0"
          aria-label="Open sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 min-w-0 flex-1 md:hidden">
          {NEXT_PUBLIC_LOGO_URL ? (
            <img src={NEXT_PUBLIC_LOGO_URL} alt="Logo" className="w-7 h-7 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
              <Hospital className="w-4 h-4 text-white" />
            </div>
          )}
          <span className="font-semibold text-sm text-gray-900 line-clamp-2 leading-snug break-words">
            {NEXT_PUBLIC_CLINIC_NAME || "ClinicHMS"}
          </span>
        </div>

        <div className="hidden md:block flex-1 min-w-0" />

        <div className="flex items-center gap-1 shrink-0 ml-auto w-full justify-end md:w-auto">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleDark}
            className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 cursor-pointer shrink-0"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <NotificationsPanel />

          <div className="relative shrink-0">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
                {session.user.fullName?.charAt(0) || "U"}
              </div>
              <div className="hidden sm:block text-left min-w-0">
                <p className="text-xs font-medium text-gray-700 leading-tight truncate max-w-[8rem]">{session.user.fullName}</p>
                <p className="text-xs text-gray-500 leading-tight truncate max-w-[8rem]">{session.user.role}</p>
              </div>
              <ChevronDown className={cn("w-4 h-4 text-gray-400 shrink-0", userMenuOpen && "rotate-180")} />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10 cursor-pointer" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-gray-200 shadow-lg z-20 py-1 overflow-hidden">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-medium text-gray-800 truncate">{session.user.fullName}</p>
                    <p className="text-xs text-gray-500 truncate">{session.user.email}</p>
                  </div>
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-800 cursor-pointer"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <UserCircle className="w-4 h-4" /> Profile
                  </Link>
                  {canSendDeveloperReport && (
                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setReportOpen(true);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-800 cursor-pointer"
                    >
                      <LifeBuoy className="w-4 h-4" /> Report to Developers
                    </button>
                  )}
                  <div className="border-t border-gray-100 mt-1 pt-1">
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-600 hover:bg-red-50 cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" /> Sign out
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <DeveloperReportModal open={reportOpen} onClose={() => setReportOpen(false)} />
    </header>
  );
}