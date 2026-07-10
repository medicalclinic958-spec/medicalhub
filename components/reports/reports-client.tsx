// components/reports/reports-client.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, Legend,
} from "recharts";
import {
  Card, CardBody, StatCard, Button, Input, Skeleton, Alert,
} from "@/components/ui";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign, TrendingDown, Wallet, TrendingUp,
  Receipt, PieChart as PieChartIcon, BarChart3, Download,
} from "lucide-react";

const COLORS = ["#0d9488", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6", "#6366f1"];

function toLocalDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

interface SummaryData {
  period: { from: string; to: string; label: string };
  summary: {
    revenue: number;
    revenueChange: number;
    expenses: number;
    expensesChange: number;
    profit: number;
    profitChange: number;
    margin: number;
    invoiceCount: number;
    averageTicket: number;
    expenseCount: number;
  };
  paymentMethods: { method: string; total: number; count: number; percentage: number }[];
  topCategories: { _id: string; total: number; count: number }[];
  recentTransactions: any[];
}

export function ReportsClient() {
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(toLocalDateString(firstOfMonth));
  const [to, setTo] = useState(toLocalDateString(today));

  const { data: summaryData, isLoading: summaryLoading, isError: summaryError } = useQuery({
    queryKey: ["report-summary", from, to],
    queryFn: () => axios.get("/api/reports", { params: { type: "summary", from, to } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["report-revenue", from, to],
    queryFn: () => axios.get("/api/reports", { params: { type: "revenue", from, to, period: "daily" } }).then(r => r.data),
  });

  const { data: cashFlowData, isLoading: cashFlowLoading } = useQuery({
    queryKey: ["report-cashflow", from, to],
    queryFn: () => axios.get("/api/reports", { params: { type: "cash-flow", from, to, period: "daily" } }).then(r => r.data),
  });

  const { data: topCategoriesData } = useQuery({
    queryKey: ["report-top-categories", from, to],
    queryFn: () => axios.get("/api/reports", { params: { type: "revenue-by-category", from, to } }).then(r => r.data),
  });

  const summary: SummaryData = summaryData?.data;
  const revenueChart = revenueData?.data || [];
  const cashFlow = cashFlowData?.data || [];
  const topCategories = topCategoriesData?.data || [];

  const handleExportCSV = () => {
    const data = summary?.summary;
    if (!data) return;
    const csv = `Metric,Value\nRevenue,${data.revenue}\nExpenses,${data.expenses}\nProfit,${data.profit}\nMargin,${data.margin}%\nInvoices,${data.invoiceCount}\nAverage Ticket,${data.averageTicket}`;
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `financial-report-${from}-to-${to}.csv`; a.click();
    URL.revokeObjectURL(url);
  };

  const quickRanges = [
    { label: "Today", days: 0 },
    { label: "This Week", days: 7 },
    { label: "This Month", days: 30 },
    { label: "3 Months", days: 90 },
    { label: "This Year", days: 365 },
  ];

  const setQuickRange = (days: number) => {
    const t = new Date();
    if (days === 0) {
      setFrom(toLocalDateString(t));
    } else {
      const d = new Date(t);
      d.setDate(d.getDate() - days);
      setFrom(toLocalDateString(d));
    }
    setTo(toLocalDateString(t));
  };

  if (summaryError) {
    return (
      <div className="p-4">
        <Alert type="error">Failed to load report data. Please try again.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Financial Reports</h1>
          <p className="text-xs text-gray-500 mt-0.5">Complete financial overview of your practice</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExportCSV}>
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row flex-wrap items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="w-36"
              />
              <span className="text-xs text-gray-400">to</span>
              <Input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="w-36"
              />
            </div>
            <div className="flex flex-wrap gap-1">
              {quickRanges.map(range => (
                <button
                  key={range.label}
                  onClick={() => setQuickRange(range.days)}
                  className="px-3 py-1 text-xs rounded-lg border border-gray-300 text-gray-600 cursor-pointer"
                >
                  {range.label}
                </button>
              ))}
            </div>
            {summary?.period && (
              <span className="text-xs text-gray-400">
                {summary.period.label}
              </span>
            )}
          </div>
        </CardBody>
      </Card>

      {/* KPI Cards */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-lg" />)}
        </div>
      ) : summary?.summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard title="Revenue" value={formatCurrency(summary.summary.revenue)} icon={DollarSign} loading={false} />
          <StatCard title="Expenses" value={formatCurrency(summary.summary.expenses)} icon={TrendingDown} loading={false} />
          <StatCard title="Net Profit" value={formatCurrency(summary.summary.profit)} icon={Wallet} loading={false} />
          <StatCard title="Profit Margin" value={`${summary.summary.margin.toFixed(1)}%`} icon={TrendingUp} loading={false} />
        </div>
      ) : null}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Revenue Chart */}
        <Card>
          <CardBody>
            <h3 className="text-xs font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-teal-600" />
              Revenue Trend
            </h3>
            {revenueLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : revenueChart.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-xs text-gray-400">
                No revenue data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueChart}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="_id" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ borderRadius: 8, border: "1px solid #d1d5db", fontSize: 11 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#0d9488" fill="url(#revenueGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Cash Flow Chart */}
        <Card>
          <CardBody>
            <h3 className="text-xs font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              Cash Flow
            </h3>
            {cashFlowLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : cashFlow.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-xs text-gray-400">
                No cash flow data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#9ca3af" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [formatCurrency(v), name === "profit" ? "Profit" : name.charAt(0).toUpperCase() + name.slice(1)]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #d1d5db", fontSize: 11 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="revenue" fill="#0d9488" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Payment Methods & Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Payment Methods */}
        {summary?.paymentMethods && summary.paymentMethods.length > 0 && (
          <Card>
            <CardBody>
              <h3 className="text-xs font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-teal-600" />
                Payment Methods
              </h3>
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="w-full md:w-1/2 max-w-[220px] mx-auto">
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={summary.paymentMethods}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        dataKey="total"
                        nameKey="method"
                        label={({ percentage }) => `${percentage.toFixed(0)}%`}
                        labelLine={false}
                      >
                        {summary.paymentMethods.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={{ borderRadius: 8, fontSize: 11 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-wrap gap-2">
                  {summary.paymentMethods.map((item, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-gray-500 capitalize">{item.method.replace(/_/g, " ")}</span>
                      <span className="text-xs font-medium text-gray-700">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Top Revenue Categories */}
        {topCategories.length > 0 && (
          <Card>
            <CardBody>
              <h3 className="text-xs font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-teal-600" />
                Top Revenue Sources
              </h3>
              <div className="space-y-2">
                {topCategories.map((cat, i) => {
                  const total = topCategories.reduce((sum, c) => sum + c.total, 0);
                  const percentage = total > 0 ? (cat.total / total) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-gray-600 capitalize">{cat._id?.replace(/_/g, " ") || "Other"}</span>
                        <span className="text-xs font-medium text-gray-700">{formatCurrency(cat.total)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${percentage}%`, backgroundColor: COLORS[i % COLORS.length] }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}