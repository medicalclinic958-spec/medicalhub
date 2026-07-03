// app/pharmacy/page.tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Plus, Search, AlertTriangle, Filter, ChevronDown, X, Package, Layers } from "lucide-react";
import {
  Card, Table, Th, Td, Button,
  EmptyState, Pagination, Badge, StatCard, Select
} from "@/components/ui";
import { formatDate, cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { MedicineCreateModal } from "@/components/pharmacy/create-medicine-modal";

interface Medicine {
  _id: string; name: string; genericName: string; category: string;
  unit: string; currentStock: number; minStockLevel: number;
  unitCost: number; sellingPrice: number; expiryDate?: string;
  storageCondition?: string; storageLocation?: string; isActive: boolean;
}

const CATEGORIES = [
  "Antibiotic", "Analgesic", "Antihypertensive", "Antidiabetic", "Antacid", "Vitamin", "Steroid", "Antihistamine", "Other"
];

export function PharmacyClient() {
  const { data: session } = useSession();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [category, setCategory] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const isSA = session?.user.isSuperAdmin;
  const perms = session?.user.permissions || [];
  const canCreate = isSA || perms.includes("pharmacy:create");

  const activeFiltersCount = [lowStockOnly, category].filter(Boolean).length;

  const { data, isLoading } = useQuery({
    queryKey: ["medicines", page, search, lowStockOnly, category],
    queryFn: () =>
      axios.get("/api/pharmacy", {
        params: {
          page,
          limit: 25,
          search: search || undefined,
          lowStock: lowStockOnly || undefined,
          category: category || undefined,
        },
      }).then(r => r.data),
  });

  const medicines: Medicine[] = data?.data || [];
  const pagination = data?.pagination;
  const lowStockCount = medicines.filter(m => m.currentStock <= m.minStockLevel).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Pharmacy</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {pagination?.total ?? 0} medicine{pagination?.total !== 1 ? "s" : ""} in inventory
          </p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="w-3.5 h-3.5" /> Add Medicine
          </Button>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard title="Total Medicines" value={pagination?.total ?? 0} icon={Package} loading={isLoading} />
        <StatCard title="Low Stock" value={lowStockCount} icon={AlertTriangle} loading={isLoading} />
        <StatCard title="Categories" value={CATEGORIES.length} icon={Layers} loading={isLoading} />
      </div>

      {/* Search + Filter Toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or generic name..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-gray-300 
                       bg-white placeholder:text-gray-400 text-gray-600
                       focus:outline-none focus:border-teal-600"
          />
        </div>
        <button
          onClick={() => setFiltersOpen(!filtersOpen)}
          className={cn(
            "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer shrink-0",
            filtersOpen || activeFiltersCount > 0
              ? "bg-teal-600 text-white border-teal-600"
              : "bg-white border-gray-300 text-gray-600"
          )}
        >
          <Filter className="w-3.5 h-3.5" />
          Filters
          {activeFiltersCount > 0 && (
            <span className="bg-white text-teal-600 text-[10px] w-4 h-4 rounded-full flex items-center justify-center font-semibold">
              {activeFiltersCount}
            </span>
          )}
          <ChevronDown className={cn("w-3 h-3", filtersOpen && "rotate-180")} />
        </button>
      </div>

      {/* Active Filter Chips */}
      {activeFiltersCount > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {lowStockOnly && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
              <AlertTriangle className="w-3 h-3" />
              Low Stock
              <button onClick={() => { setLowStockOnly(false); setPage(1); }} className="cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {category && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 border border-teal-200 text-xs text-teal-700">
              {category}
              <button onClick={() => { setCategory(""); setPage(1); }} className="cursor-pointer">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={() => { setLowStockOnly(false); setCategory(""); setPage(1); }}
            className="text-xs text-gray-400 cursor-pointer"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Expanded Filters */}
      {filtersOpen && (
        <div className="bg-gray-50 rounded-lg border border-gray-300 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Category</label>
              <Select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
                <option value="">All Categories</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-3 px-3 py-2 rounded-lg border border-gray-300 bg-white cursor-pointer w-full sm:w-auto">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-medium text-gray-600">Low Stock Only</span>
                <input
                  type="checkbox"
                  checked={lowStockOnly}
                  onChange={e => { setLowStockOnly(e.target.checked); setPage(1); }}
                  className="ml-auto w-4 h-4 rounded border-gray-300 accent-amber-500 cursor-pointer"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Table */}
      <Card className="hidden md:block overflow-x-auto">
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Generic</Th>
              <Th>Category</Th>
              <Th>Stock</Th>
              <Th>Min</Th>
              <Th>Unit Cost</Th>
              <Th>Selling</Th>
              <Th>Expiry</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(9)].map((_, j) => (
                    <Td key={j}><div className="h-4 bg-gray-100 rounded" /></Td>
                  ))}
                </tr>
              ))
            ) : medicines.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    title="No medicines found"
                    description="Try adjusting your filters or add a new medicine"
                    action={canCreate ? (
                      <Button size="sm" onClick={() => setCreateOpen(true)}>
                        <Plus className="w-3.5 h-3.5" /> Add Medicine
                      </Button>
                    ) : undefined}
                  />
                </td>
              </tr>
            ) : (
              medicines.map(m => {
                const isLow = m.currentStock <= m.minStockLevel;
                const isExpiring = m.expiryDate && new Date(m.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                return (
                  <tr key={m._id} className={cn(isLow && "bg-amber-50/40")}>
                    <Td>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {m.name}
                        {isLow && <Badge variant="warning">Low</Badge>}
                      </div>
                    </Td>
                    <Td className="text-gray-500 max-w-[120px] truncate">{m.genericName}</Td>
                    <Td><Badge variant="outline">{m.category}</Badge></Td>
                    <Td>
                      <span className={cn("font-semibold", isLow ? "text-red-500" : "text-gray-700")}>
                        {m.currentStock}
                      </span>
                      <span className="text-gray-400 ml-0.5">{m.unit}</span>
                    </Td>
                    <Td className="text-gray-400">{m.minStockLevel} <span>{m.unit}</span></Td>
                    <Td className="text-gray-600">PKR {m.unitCost?.toLocaleString()}</Td>
                    <Td className="text-gray-600">PKR {m.sellingPrice?.toLocaleString()}</Td>
                    <Td>
                      {m.expiryDate ? (
                        <span className={cn(isExpiring ? "text-red-500 font-medium" : "text-gray-500")}>
                          {formatDate(m.expiryDate)}
                          {isExpiring && <AlertTriangle className="w-3 h-3 inline ml-1 text-red-500" />}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </Td>
                    <Td>
                      <Button size="sm" onClick={() => router.push(`/pharmacy/${m._id}`)}>
                        View
                      </Button>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-300 flex justify-end">
            <Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} />
          </div>
        )}
      </Card>

      {/* Tablet - Simplified columns */}
      <Card className="hidden sm:block md:hidden overflow-x-auto">
        <Table>
          <thead>
            <tr>
              <Th>Name</Th>
              <Th>Category</Th>
              <Th>Stock</Th>
              <Th>Expiry</Th>
              <Th>Actions</Th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(5)].map((_, j) => (
                    <Td key={j}><div className="h-4 bg-gray-100 rounded" /></Td>
                  ))}
                </tr>
              ))
            ) : medicines.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <EmptyState
                    title="No medicines found"
                    description="Try adjusting your filters or add a new medicine"
                    action={canCreate ? (
                      <Button size="sm" onClick={() => setCreateOpen(true)}>
                        <Plus className="w-3.5 h-3.5" /> Add Medicine
                      </Button>
                    ) : undefined}
                  />
                </td>
              </tr>
            ) : (
              medicines.map(m => {
                const isLow = m.currentStock <= m.minStockLevel;
                const isExpiring = m.expiryDate && new Date(m.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                return (
                  <tr key={m._id} className={cn(isLow && "bg-amber-50/40")}>
                    <Td>
                      <div className="font-medium text-gray-900 flex items-center gap-2">
                        {m.name}
                        {isLow && <Badge variant="warning">Low</Badge>}
                      </div>
                      <div className="text-gray-400 text-[11px] mt-0.5">{m.genericName}</div>
                    </Td>
                    <Td><Badge variant="outline">{m.category}</Badge></Td>
                    <Td>
                      <span className={cn("font-semibold", isLow ? "text-red-500" : "text-gray-700")}>
                        {m.currentStock}
                      </span>
                      <span className="text-gray-400 ml-0.5">{m.unit}</span>
                    </Td>
                    <Td>
                      {m.expiryDate ? (
                        <span className={cn(isExpiring ? "text-red-500 font-medium" : "text-gray-500")}>
                          {formatDate(m.expiryDate)}
                          {isExpiring && <AlertTriangle className="w-3 h-3 inline ml-1 text-red-500" />}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </Td>
                    <Td>
                      <Button size="sm" onClick={() => router.push(`/pharmacy/${m._id}`)}>
                        View
                      </Button>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-300 flex justify-end">
            <Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} />
          </div>
        )}
      </Card>

      {/* Mobile - Name + Actions only */}
      <div className="sm:hidden divide-y divide-gray-100 border border-gray-300 rounded-lg bg-white">
        {isLoading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="p-3 flex items-center justify-between">
              <div className="h-4 bg-gray-100 rounded w-32" />
              <div className="h-7 bg-gray-100 rounded w-14" />
            </div>
          ))
        ) : medicines.length === 0 ? (
          <EmptyState
            title="No medicines found"
            description="Try adjusting your filters"
            action={canCreate ? (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Plus className="w-3.5 h-3.5" /> Add Medicine
              </Button>
            ) : undefined}
          />
        ) : (
          medicines.map(m => {
            const isLow = m.currentStock <= m.minStockLevel;
            return (
              <div key={m._id} className="flex items-center justify-between p-3 gap-2">
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span className={cn(
                    "text-xs font-medium truncate",
                    isLow ? "text-red-600" : "text-gray-900"
                  )}>
                    {m.name}
                  </span>
                  {isLow && <Badge variant="warning">Low</Badge>}
                </div>
                <Button size="sm" onClick={() => router.push(`/pharmacy/${m._id}`)}>
                  View
                </Button>
              </div>
            );
          })
        )}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 flex justify-center">
            <Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} />
          </div>
        )}
      </div>

      <MedicineCreateModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}