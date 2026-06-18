"use client";

import { useQuery } from "@tanstack/react-query";
import { Session } from "next-auth";
import {
  Users, Calendar, Stethoscope, DollarSign,
  Receipt, FlaskConical, TrendingUp, Clock,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from "recharts";
import { StatCard, Card, CardHeader, CardBody, StatusBadge, Skeleton } from "@/components/ui";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";
import axios from "axios";

interface DashboardStats {
  totalPatients: number | null;
  todayAppointments: number | null;
  totalDoctors: number | null;
  monthlyRevenue: number;
  pendingBills: number | null;
  labPending: number | null;
  totalStaff: number | null;
  appointmentsByStatus: Record<string, number>;
  recentActivities: Record<string, unknown>[];
  revenueChart: { date: string; revenue: number; expenses: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "#3b82f6",
  checked_in: "#8b5cf6",
  in_consultation: "#f59e0b",
  completed: "#10b981",
  cancelled: "#ef4444",
  no_show: "#6b7280",
};

export function DashboardClient({ session }: { session: Session }) {
  const perms = session.user.permissions || [];
  const isSA = session.user.isSuperAdmin;

  const { data, isLoading } = useQuery<{ success: boolean; data: DashboardStats }>({
    queryKey: ["dashboard"],
    queryFn: () => axios.get("/api/dashboard").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const stats = data?.data;

  const appointmentChartData = Object.entries(stats?.appointmentsByStatus ?? {}).map(
    ([status, count]) => ({ name: status.replace(/_/g, " "), value: count, color: STATUS_COLORS[status] || "#94a3b8" })
  );

  const quickActions = [
    { label: "New Patient", href: "/patients?action=new", perm: "patients:create", color: "bg-blue-600 hover:bg-blue-500" },
    { label: "Book Appointment", href: "/appointments?action=new", perm: "appointments:create", color: "bg-purple-600 hover:bg-purple-500" },
    { label: "New Invoice", href: "/billing?action=new", perm: "billing:create", color: "bg-emerald-600 hover:bg-emerald-500" },
    { label: "Lab Test", href: "/lab?action=new", perm: "lab:create", color: "bg-amber-600 hover:bg-amber-500" },
  ].filter((a) => isSA || perms.includes(a.perm));

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
        <p className="text-sm text-slate-500">
          Welcome back, {session.user.fullName}. Here&apos;s what&apos;s happening today.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {(perms.includes("patients:view") || isSA) && (
          <StatCard
            title="Total Patients"
            value={stats?.totalPatients ?? null}
            icon={Users}
            color="blue"
            loading={isLoading}
          />
        )}
        {(perms.includes("appointments:view") || isSA) && (
          <StatCard
            title="Today's Appointments"
            value={stats?.todayAppointments ?? null}
            icon={Calendar}
            color="purple"
            loading={isLoading}
          />
        )}
        {(perms.includes("doctors:view") || isSA) && (
          <StatCard
            title="Active Doctors"
            value={stats?.totalDoctors ?? null}
            icon={Stethoscope}
            color="emerald"
            loading={isLoading}
          />
        )}
        {(perms.includes("billing:view") || isSA) && (
          <StatCard
            title="Monthly Revenue"
            value={stats ? formatCurrency(stats.monthlyRevenue) : null}
            icon={DollarSign}
            color="amber"
            loading={isLoading}
          />
        )}
        {(perms.includes("billing:view") || isSA) && (
          <StatCard
            title="Pending Bills"
            value={stats?.pendingBills ?? null}
            icon={Receipt}
            color="red"
            loading={isLoading}
          />
        )}
        {(perms.includes("lab:view") || isSA) && (
          <StatCard
            title="Lab Tests Pending"
            value={stats?.labPending ?? null}
            icon={FlaskConical}
            color="purple"
            loading={isLoading}
          />
        )}
        {(perms.includes("staff:view") || isSA) && (
          <StatCard
            title="Active Staff"
            value={stats?.totalStaff ?? null}
            icon={Users}
            color="blue"
            loading={isLoading}
          />
        )}
      </div>

      {/* Quick actions */}
      {quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {quickActions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-all ${a.color}`}
            >
              + {a.label}
            </Link>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        {(perms.includes("billing:view") || isSA) && (
          <Card className="xl:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">Revenue — Last 7 Days</h3>
              </div>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats?.revenueChart || []}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#cbd5e1" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#cbd5e1" />
                    <Tooltip
                      formatter={(v: number) => formatCurrency(v)}
                      contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#3b82f6" fill="url(#revGrad)" strokeWidth={2} name="Revenue" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardBody>
          </Card>
        )}

        {/* Appointment Status Pie */}
        {(perms.includes("appointments:view") || isSA) && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">Appointments by Status</h3>
              </div>
            </CardHeader>
            <CardBody>
              {isLoading ? (
                <Skeleton className="h-48 w-full" />
              ) : appointmentChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={appointmentChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      dataKey="value"
                    >
                      {appointmentChartData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
                  No appointment data
                </div>
              )}
            </CardBody>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      {(isSA || perms.includes("audit_logs:view")) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-700">Recent Activity</h3>
              </div>
              <Link href="/audit-logs" className="text-xs text-blue-600 hover:text-blue-500">
                View all
              </Link>
            </div>
          </CardHeader>
          <CardBody className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : (stats?.recentActivities?.length ?? 0) > 0 ? (
              <ul className="divide-y divide-slate-100">
                {stats!.recentActivities.map((activity, i) => (
                  <li key={i} className="flex items-center gap-3 px-6 py-3">
                    <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 truncate">
                        {activity.description as string}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={(activity.status as string) || "success"} />
                        <span className="text-xs text-slate-400">
                          {formatDate(new Date(activity.createdAt as string))}
                        </span>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 capitalize shrink-0">
                      {(activity.module as string)?.replace(/_/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-10 text-center text-sm text-slate-400">No recent activity</div>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
