"use client";

import { useState, useEffect } from "react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { LogOut, ChevronDown, UserCircle, Menu, Hospital, Sun, Moon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NotificationsPanel } from "./notifications-panel";
import { useSidebar } from "../sidebar-context";
import { NEXT_PUBLIC_CLINIC_NAME, NEXT_PUBLIC_LOGO_URL } from "@/constants/ClinicDetails";

interface HeaderProps { session: Session }

export function Header({ session }: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const { toggleMobile } = useSidebar();

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
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-4 sm:px-6 gap-3 shrink-0 z-10">
      <button
        onClick={toggleMobile}
        className="md:hidden p-2 -ml-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 cursor-pointer shrink-0"
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      <div className="flex items-center gap-2 md:hidden">
        {NEXT_PUBLIC_LOGO_URL ? (
          <img src={NEXT_PUBLIC_LOGO_URL} alt="Logo" className="w-7 h-7 rounded-lg object-cover shrink-0" />
        ) : (
          <div className="w-7 h-7 rounded-lg bg-teal-600 flex items-center justify-center shrink-0">
            <Hospital className="w-4 h-4 text-white" />
          </div>
        )}
        <span className="font-semibold text-sm text-gray-900 whitespace-nowrap">
          {NEXT_PUBLIC_CLINIC_NAME || "ClinicHMS"}
        </span>
      </div>

      <div className="flex-1" />

      {/* Dark Mode Toggle */}
      <button
        onClick={toggleDark}
        className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-50 cursor-pointer"
        aria-label="Toggle dark mode"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <NotificationsPanel />

      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-gray-50 cursor-pointer"
        >
          <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {session.user.fullName?.charAt(0) || "U"}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-medium text-gray-700 leading-tight">{session.user.fullName}</p>
            <p className="text-xs text-gray-500 leading-tight">{session.user.role}</p>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-gray-400", userMenuOpen && "rotate-180")} />
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
    </header>
  );
}