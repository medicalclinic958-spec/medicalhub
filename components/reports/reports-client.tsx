"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  Card, CardHeader, CardBody, StatCard, Button, Select, Input, Skeleton, Alert,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import {
  Users, Calendar, DollarSign, TrendingDown,
  FlaskConical, BarChart3, Download,
} from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

export function ReportsClient() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstOfMonth.toISOString().split("T")[0]);
  const [to, setTo] = useState(today.toISOString().split("T")[0]);
  const [reportType, setReportType] = useState("summary");

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ["report-summary", from, to],
    queryFn: () => axios.get("/api/reports", { params: { type: "summary", from, to } }).then(r => r.data),
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["report-revenue", from, to],
    queryFn: () => axios.get("/api/reports", { params: { type: "revenue", from, to } }).then(r => r.data),
    enabled: reportType === "revenue" || reportType === "summary",
  });

  const { data: patientsData, isLoading: patientsLoading } = useQuery({
    queryKey: ["report-patients", from, to],
    queryFn: () => axios.get("/api/reports", { params: { type: "patients", from, to } }).then(r => r.data),
    enabled: reportType === "patients" || reportType === "summary",
  });

  const { data: apptData } = useQuery({
    queryKey: ["report-appointments", from, to],
    queryFn: () => axios.get("/api/reports", { params: { type: "appointments", from, to } }).then(r => r.data),
    enabled: reportType === "appointments" || reportType === "summary",
  });

  const summary = summaryData?.data;
  const revenueChart = revenueData?.data || [];
  const patientsChart = patientsData?.data || [];
  const apptChart = (apptData?.data || []).map((d: { _id: string; count: number }) => ({
    name: d._id?.replace(/_/g, " "),
    value: d.count,
  }));

  const handleExportCSV = (type: string) => {
    let csvData: string;
    let filename: string;

    if (type === "revenue" && revenueChart.length) {
      csvData = "Date,Revenue,Count\n" + revenueChart.map((r: { _id: string; revenue: number; count: number }) =>
        `${r._id},${r.revenue},${r.count}`).join("\n");
      filename = `revenue-report-${from}-to-${to}.csv`;
    } else if (type === "patients" && patientsChart.length) {
      csvData = "Date,New Patients\n" + patientsChart.map((r: { _id: string; count: number }) =>
        `${r._id},${r.count}`).join("\n");
      filename = `patients-report-${from}-to-${to}.csv`;
    } else {
      csvData = "Metric,Value\n" +
        `Total Patients,${summary?.totalPatients}\n` +
        `Total Appointments,${summary?.totalAppointments}\n` +
        `Revenue,${summary?.revenue}\n` +
        `Expenses,${summary?.expenses}\n` +
        `Profit,${summary?.profit}\n` +
        `Lab Tests,${summary?.labTests}`;
      filename = `summary-report-${from}-to-${to}.csv`;
    }

    const blob = new Blob([csvData], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">Financial and operational insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExportCSV(reportType)}>
            <Download className="w-4 h-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Date range + type filter */}
      <Card>
        <CardBody className="py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <Select value={reportType} onChange={e => setReportType(e.target.value)} className="w-40">
              <option value="summary">Summary</option>
              <option value="revenue">Revenue</option>
              <option value="patients">Patients</option>
              <option value="appointments">Appointments</option>
            </Select>
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <span>From</span>
              <Input type="date" value={from} onChange={e => setFrom(e.target.value)} className="w-36" />
              <span>To</span>
              <Input type="date" value={to} onChange={e => setTo(e.target.value)} className="w-36" />
            </div>
            {/* Quick range buttons */}
            <div className="flex gap-1">
              {[
                { label: "This Month", days: 0 },
                { label: "Last 30d", days: 30 },
                { label: "Last 90d", days: 90 },
                { label: "This Year", days: -1 },
              ].map(r => (
                <button
                  key={r.label}
                  onClick={() => {
                    const t = new Date();
                    if (r.days === 0) {
                      setFrom(new Date(t.getFullYear(), t.getMonth(), 1).toISOString().split("T")[0]);
                    } else if (r.days === -1) {
                      setFrom(new Date(t.getFullYear(), 0, 1).toISOString().split("T")[0]);
                    } else {
                      const d = new Date(t); d.setDate(d.getDate() - r.days);
                      setFrom(d.toISOString().split("T")[0]);
                    }
                    setTo(t.toISOString().split("T")[0]);
                  }}
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-300 transition-all"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {summaryLoading ? (
          [...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard title="Active Patients" value={summary?.totalPatients ?? "—"} icon={Users} color="blue" />
            <StatCard title="Appointments" value={summary?.totalAppointments ?? "—"} icon={Calendar} color="purple" />
            <StatCard title="Revenue" value={summary ? formatCurrency(summary.revenue) : "—"} icon={DollarSign} color="emerald" />
            <StatCard title="Expenses" value={summary ? formatCurrency(summary.expenses) : "—"} icon={TrendingDown} color="red" />
            <StatCard title="Net Profit" value={summary ? formatCurrency(summary.profit) : "—"} icon={BarChart3} color={summary?.profit >= 0 ? "emerald" : "red"} />
            <StatCard title="Lab Tests" value={summary?.labTests ?? "—"} icon={FlaskConical} color="amber" />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Revenue chart */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-500" />
              Daily Revenue
            </h3>
          </CardHeader>
          <CardBody>
            {revenueLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : revenueChart.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-slate-400">No revenue data in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <BarChart data={revenueChart.map((d: { _id: string; revenue: number; count: number }) => ({ date: d._id, revenue: d.revenue, invoices: d.count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#cbd5e1" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#cbd5e1" tickFormatter={v => `PKR ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [name === "revenue" ? formatCurrency(v) : v, name === "revenue" ? "Revenue" : "Invoices"]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="revenue" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* New patients chart */}
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-500" />
              New Patient Registrations
            </h3>
          </CardHeader>
          <CardBody>
            {patientsLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : patientsChart.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-slate-400">No patient data in this period</div>
            ) : (
              <ResponsiveContainer width="100%" height={210}>
                <LineChart data={patientsChart.map((d: { _id: string; count: number }) => ({ date: d._id, patients: d.count }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#cbd5e1" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#cbd5e1" allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }} />
                  <Line type="monotone" dataKey="patients" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="New Patients" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Appointment status breakdown */}
      {apptChart.length > 0 && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-500" />
              Appointment Status Breakdown
            </h3>
          </CardHeader>
          <CardBody>
            <div className="flex flex-col md:flex-row items-center gap-6">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={apptChart} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                    {apptChart.map((_: unknown, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-3 shrink-0">
                {apptChart.map((d: { name: string; value: number }, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-slate-600 capitalize">{d.name}</span>
                    <span className="text-sm font-semibold text-slate-800 ml-auto pl-2">{d.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Financial summary table */}
      {summary && (
        <Card>
          <CardHeader>
            <h3 className="text-sm font-semibold text-slate-700">Financial Summary — {from} to {to}</h3>
          </CardHeader>
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <tbody>
                {[
                  { label: "Total Revenue Collected", value: formatCurrency(summary.revenue), color: "text-emerald-600 font-semibold" },
                  { label: "Total Expenses", value: formatCurrency(summary.expenses), color: "text-red-500 font-semibold" },
                  { label: "Net Profit / Loss", value: formatCurrency(summary.profit), color: summary.profit >= 0 ? "text-emerald-700 font-bold" : "text-red-600 font-bold" },
                  { label: "Total Appointments", value: summary.totalAppointments, color: "text-slate-700" },
                  { label: "Active Patients", value: summary.totalPatients, color: "text-slate-700" },
                  { label: "Lab Tests Ordered", value: summary.labTests, color: "text-slate-700" },
                ].map((row, i) => (
                  <tr key={i} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-6 py-3 text-slate-600">{row.label}</td>
                    <td className={`px-6 py-3 text-right ${row.color}`}>{row.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
