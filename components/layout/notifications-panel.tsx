"use client";

import { useState } from "react";
import { Bell, X, Check, CheckCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { formatDate } from "@/lib/utils";
import Link from "next/link";

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  priority: "low" | "medium" | "high";
  actionUrl?: string;
  createdAt: string;
}

const PRIORITY_COLORS = {
  high: "bg-red-100 border-red-200",
  medium: "bg-amber-50 border-amber-200",
  low: "bg-slate-50 border-slate-200",
};

export function NotificationsPanel() {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications", false],
    queryFn: () => axios.get("/api/notifications", { params: { limit: 20 } }).then(r => r.data),
    refetchInterval: 30_000,
  });

  const notifications: Notification[] = data?.data || [];
  const unreadCount = notifications.filter(n => !n.isRead).length;

  const markRead = useMutation({
    mutationFn: (id: string) => axios.put("/api/notifications", { id }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  const markAllRead = useMutation({
    mutationFn: () => axios.put("/api/notifications", { markAllRead: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl z-20 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-slate-700">Notifications</span>
                {unreadCount > 0 && (
                  <span className="text-xs bg-blue-100 text-blue-600 font-medium px-1.5 py-0.5 rounded">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 text-xs flex items-center gap-1"
                    title="Mark all as read"
                  >
                    <CheckCheck className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Notifications list */}
            <div className="overflow-y-auto max-h-80">
              {notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">No notifications</p>
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n._id}
                    className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${!n.isRead ? "bg-blue-50/40" : ""}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.isRead ? "bg-blue-500" : "bg-transparent"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-700">{n.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{formatDate(n.createdAt)}</p>
                      </div>
                      {!n.isRead && (
                        <button
                          onClick={() => markRead.mutate(n._id)}
                          className="p-1 rounded text-slate-300 hover:text-blue-500 shrink-0"
                          title="Mark as read"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {n.actionUrl && (
                      <Link
                        href={n.actionUrl}
                        className="text-[10px] text-blue-500 hover:text-blue-600 ml-4 mt-0.5 block"
                        onClick={() => setOpen(false)}
                      >
                        View →
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
