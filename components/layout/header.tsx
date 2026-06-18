"use client";

import { useState } from "react";
import { Session } from "next-auth";
import { signOut } from "next-auth/react";
import { Settings, User, LogOut, ChevronDown } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NotificationsPanel } from "./notifications-panel";

interface HeaderProps { session: Session }

export function Header({ session }: HeaderProps) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  return (
    <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 shrink-0 z-10">
      <div className="flex-1" />

      {/* Notifications */}
      <NotificationsPanel />

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all"
        >
          <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {session.user.fullName?.charAt(0) || "U"}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-slate-700 leading-tight">{session.user.fullName}</p>
            <p className="text-xs text-slate-400 leading-tight">{session.user.role}</p>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-slate-400 transition-transform", userMenuOpen && "rotate-180")} />
        </button>

        {userMenuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-slate-200 shadow-lg z-20 py-1 overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-sm font-medium text-slate-800 truncate">{session.user.fullName}</p>
                <p className="text-xs text-slate-400 truncate">{session.user.email}</p>
              </div>
              <Link href="/settings" className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all" onClick={() => setUserMenuOpen(false)}>
                <Settings className="w-4 h-4" /> Settings
              </Link>
              <div className="border-t border-slate-100 mt-1 pt-1">
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-all"
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
