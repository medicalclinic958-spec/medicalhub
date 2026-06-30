"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell,
  AreaChart, Area,
} from "recharts";
import {
  Card, CardHeader, CardBody, StatCard, Button, Select, Input, Skeleton, Alert,
} from "@/components/ui";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import {
  Users, Calendar, DollarSign, TrendingDown,
  FlaskConical, BarChart3, Download, TrendingUp,
  Wallet, Receipt, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight,
} from "lucide-react";

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];

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
  const [from, setFrom] = useState(firstOfMonth.toISOString().split("T")[0]);
  const [to, setTo] = useState(today.toISOString().split("T")[0]);
  const [reportType, setReportType] = useState("summary");
  const [activeTab, setActiveTab] = useState("overview");

  // Main summary query
  const { data: summaryData, isLoading: summaryLoading, isError: summaryError } = useQuery({
    queryKey: ["report-summary", from, to],
    queryFn: () => axios.get("/api/reports", { params: { type: "summary", from, to } }).then(r => r.data),
    staleTime: 5 * 60 * 1000,
  });

  // Revenue chart data
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ["report-revenue", from, to],
    queryFn: () => axios.get("/api/reports", { params: { type: "revenue", from, to, period: "daily" } }).then(r => r.data),
    enabled: activeTab === "overview" || activeTab === "revenue",
  });

  // Cash flow data
  const { data: cashFlowData, isLoading: cashFlowLoading } = useQuery({
    queryKey: ["report-cashflow", from, to],
    queryFn: () => axios.get("/api/reports", { params: { type: "cash-flow", from, to, period: "daily" } }).then(r => r.data),
    enabled: activeTab === "overview" || activeTab === "revenue",
  });

  // Top categories
  const { data: topCategoriesData } = useQuery({
    queryKey: ["report-top-categories", from, to],
    queryFn: () => axios.get("/api/reports", { params: { type: "revenue-by-category", from, to } }).then(r => r.data),
    enabled: activeTab === "overview",
  });

  const summary: SummaryData = summaryData?.data;
  const revenueChart = revenueData?.data || [];
  const cashFlow = cashFlowData?.data || [];
  const topCategories = topCategoriesData?.data || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "text-emerald-600 bg-emerald-50";
      case "partial": return "text-amber-600 bg-amber-50";
      case "pending": return "text-blue-600 bg-blue-50";
      case "overdue": return "text-red-600 bg-red-50";
      default: return "text-slate-600 bg-slate-50";
    }
  };

  const handleExportCSV = () => {
    const data = summary?.summary;
    if (!data) return;
    const csv = `Metric,Value
Revenue,${data.revenue}
Expenses,${data.expenses}
Profit,${data.profit}
Margin,${data.margin}%
Invoices,${data.invoiceCount}
Average Ticket,${data.averageTicket}
`;
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
    { label: "Last 3 Months", days: 90 },
    { label: "This Year", days: 365 },
    { label: "All Time", days: -1 },
  ];

  const tabs = [
    { id: "overview", label: "Overview", icon: BarChart3 },
    { id: "revenue", label: "Revenue", icon: DollarSign },
    { id: "expenses", label: "Expenses", icon: TrendingDown },
  ];

  if (summaryError) {
    return (
      <div className="p-8">
        <Alert type="error">Failed to load report data. Please try again.</Alert>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Financial Reports</h1>
          <p className="text-sm text-slate-500">Complete financial overview of your practice</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2">
            <Download className="w-4 h-4" /> Export
          </Button>
        </div>
      </div>

      {/* Filters - Clean and intuitive */}
      <Card className="border-slate-200 shadow-sm">
        <CardBody className="py-4">
          <div className="flex flex-wrap items-center gap-4">
            {/* Date range */}
            <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-1.5 border border-slate-200">
              <span className="text-xs font-medium text-slate-500">From</span>
              <Input
                type="date"
                value={from}
                onChange={e => setFrom(e.target.value)}
                className="w-32 h-8 text-sm border-0 bg-transparent p-0 focus:ring-0"
              />
              <span className="text-xs font-medium text-slate-500">To</span>
              <Input
                type="date"
                value={to}
                onChange={e => setTo(e.target.value)}
                className="w-32 h-8 text-sm border-0 bg-transparent p-0 focus:ring-0"
              />
            </div>

            {/* Quick ranges */}
            <div className="flex flex-wrap gap-1">
              {quickRanges.map(range => (
                <button
                  key={range.label}
                  onClick={() => {
                    const t = new Date();
                    if (range.days === 0) {
                      setFrom(t.toISOString().split("T")[0]);
                    } else if (range.days === -1) {
                      const d = new Date(2020, 0, 1);
                      setFrom(d.toISOString().split("T")[0]);
                    } else {
                      const d = new Date(t);
                      d.setDate(d.getDate() - range.days);
                      setFrom(d.toISOString().split("T")[0]);
                    }
                    setTo(t.toISOString().split("T")[0]);
                  }}
                  className={cn(
                    "px-3 py-1 text-xs rounded-full border transition-all",
                    "hover:bg-slate-100 hover:border-slate-300",
                    "text-slate-600 border-slate-200"
                  )}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>

          {/* Selected period display */}
          {summary?.period && (
            <div className="mt-2 text-xs text-slate-400">
              Showing data for: <span className="font-medium text-slate-600">{summary.period.label}</span>
            </div>
          )}
        </CardBody>
      </Card>


      {/* KPI Cards - Clean, readable, with trends */}
      {summaryLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
        </div>
      ) : summary?.summary ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Revenue"
            value={formatCurrency(summary.summary.revenue)}
            icon={DollarSign}
            color="emerald"
            trend={summary.summary.revenueChange}
            trendLabel="vs previous period"
          />
          <StatCard
            title="Expenses"
            value={formatCurrency(summary.summary.expenses)}
            icon={TrendingDown}
            color="red"
            trend={summary.summary.expensesChange}
            trendLabel="vs previous period"
          />
          <StatCard
            title="Net Profit"
            value={formatCurrency(summary.summary.profit)}
            icon={Wallet}
            color={summary.summary.profit >= 0 ? "emerald" : "red"}
            trend={summary.summary.profitChange}
            trendLabel="vs previous period"
          />
          <StatCard
            title="Profit Margin"
            value={`${summary.summary.margin.toFixed(1)}%`}
            icon={TrendingUp}
            color="blue"
            subtitle={`Avg Ticket: ${formatCurrency(summary.summary.averageTicket)}`}
          />
        </div>
      ) : null}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                Revenue Trend
              </h3>
            </div>
          </CardHeader>
          <CardBody>
            {revenueLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : revenueChart.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-slate-400">
                No revenue data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={revenueChart}>
                  <defs>
                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="_id" tick={{ fontSize: 10 }} stroke="#cbd5e1" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#cbd5e1" tickFormatter={v => `PKR ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number) => formatCurrency(v)}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#10b981" fill="url(#revenueGradient)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>

        {/* Cash Flow Chart */}
        <Card className="shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-blue-500" />
                Cash Flow (Revenue vs Expenses)
              </h3>
            </div>
          </CardHeader>
          <CardBody>
            {cashFlowLoading ? (
              <Skeleton className="h-52 w-full" />
            ) : cashFlow.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-sm text-slate-400">
                No cash flow data for this period
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={cashFlow}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="#cbd5e1" />
                  <YAxis tick={{ fontSize: 10 }} stroke="#cbd5e1" tickFormatter={v => `PKR ${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(v: number, name: string) => [formatCurrency(v), name === "profit" ? "Profit" : name]}
                    contentStyle={{ borderRadius: 8, border: "1px solid #e2e8f0", fontSize: 12 }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} name="Revenue" />
                  <Bar dataKey="expenses" fill="#ef4444" radius={[4, 4, 0, 0]} name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Bottom Row: Payment Methods & Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payment Methods */}
        {summary?.paymentMethods && summary.paymentMethods.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <PieChartIcon className="w-4 h-4 text-purple-500" />
                Payment Methods
              </h3>
            </CardHeader>
            <CardBody>
              <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                <div className="w-full md:w-1/2 max-w-[280px] mx-auto">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={summary.paymentMethods}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={75}
                        dataKey="total"
                        nameKey="method"
                        label={({ method, percentage }) => `${percentage.toFixed(0)}%`}
                        labelLine={false}
                      >
                        {summary.paymentMethods.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => formatCurrency(v)}
                        contentStyle={{ borderRadius: 8, fontSize: 12 }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full md:w-auto shrink-0">
                  {summary.paymentMethods.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 px-2 py-1 rounded hover:bg-slate-50 transition-colors">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-slate-600 capitalize">{item.method.replace(/_/g, " ")}</span>
                      <span className="text-xs font-semibold text-slate-800 ml-auto">{formatCurrency(item.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Top Revenue Categories */}
        {topCategories.length > 0 && (
          <Card className="shadow-sm">
            <CardHeader>
              <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" />
                Top Revenue Sources
              </h3>
            </CardHeader>
            <CardBody>
              <div className="space-y-2">
                {topCategories.map((cat, i) => {
                  const total = topCategories.reduce((sum, c) => sum + c.total, 0);
                  const percentage = total > 0 ? (cat.total / total) * 100 : 0;
                  return (
                    <div key={i}>
                      <div className="flex items-center justify-between text-sm mb-0.5">
                        <span className="text-slate-600 capitalize">{cat._id?.replace(/_/g, " ") || "Other"}</span>
                        <span className="font-medium text-slate-800">{formatCurrency(cat.total)}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
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