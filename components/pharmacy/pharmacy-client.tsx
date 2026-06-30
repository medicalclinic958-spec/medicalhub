// app/pharmacy/page.tsx (or wherever PharmacyClient is)
"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Plus, Search, AlertTriangle, Eye } from "lucide-react";
import {
  Card, CardBody, Table, Th, Td, Button,
  EmptyState, Pagination, Badge, Alert, StatCard, Input
} from "@/components/ui";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Pill } from "lucide-react";
import { MedicineCreateModal } from "@/components/pharmacy/create-medicine-modal";

interface Medicine {
  _id: string; name: string; genericName: string; category: string;
  unit: string; currentStock: number; minStockLevel: number;
  unitCost: number; sellingPrice: number; expiryDate?: string;
  storageCondition?: string; storageLocation?: string; isActive: boolean;
}

export function PharmacyClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const isSA = session?.user.isSuperAdmin;
  const perms = session?.user.permissions || [];
  const canCreate = isSA || perms.includes("pharmacy:create");

  const { data, isLoading } = useQuery({
    queryKey: ["medicines", page, search, lowStockOnly],
    queryFn: () => axios.get("/api/pharmacy", { params: { page, limit: 25, search, lowStock: lowStockOnly } }).then(r => r.data),
  });

  const medicines: Medicine[] = data?.data || [];
  const pagination = data?.pagination;
  const lowStockCount = medicines.filter(m => m.currentStock <= m.minStockLevel).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Pharmacy</h1>
          <p className="text-sm text-slate-500">{pagination?.total ?? 0} medicines in inventory</p>
        </div>
        {canCreate && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="w-4 h-4" /> Add Medicine
          </Button>
        )}
      </div>

      {lowStockCount > 0 && (
        <Alert type="warning">
          <strong>{lowStockCount} medicine{lowStockCount > 1 ? "s" : ""}</strong> {lowStockCount > 1 ? "are" : "is"} below minimum stock level.
        </Alert>
      )}

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Medicines" value={pagination?.total ?? 0} icon={Pill} color="blue" loading={isLoading} />
        <StatCard title="Low Stock Items" value={lowStockCount} icon={AlertTriangle} color="amber" loading={isLoading} />
        <StatCard title="Showing on Page" value={medicines.length} icon={Pill} color="emerald" loading={isLoading} />
      </div>

      <Card>
        <CardBody className="py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search medicines..."
                value={search}
                onChange={e => { setSearch(e.target.value); setPage(1); }}
                className="pl-9"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={e => { setLowStockOnly(e.target.checked); setPage(1); }}
                className="rounded"
              />
              Low stock only
            </label>
          </div>
        </CardBody>
      </Card>

      <Card>
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
                    <Td key={j}>
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </Td>
                  ))}
                </tr>
              ))
            ) : medicines.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <EmptyState
                    title="No medicines found"
                    action={canCreate ? (
                      <Button size="sm" onClick={() => setCreateOpen(true)}>
                        <Plus className="w-3.5 h-3.5" /> Add Medicine
                      </Button>
                    ) : undefined}
                  />
                </td>
              </tr>
            ) : medicines.map(m => {
              const isLow = m.currentStock <= m.minStockLevel;
              const isExpiring = m.expiryDate && new Date(m.expiryDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
              return (
                <tr key={m._id} className={`hover:bg-slate-50 ${isLow ? "bg-amber-50/50" : ""}`}>
                  <Td>
                    <div className="font-medium text-slate-800 flex items-center gap-2">
                      {m.name}
                      {isLow && <Badge variant="warning">Low</Badge>}
                    </div>
                  </Td>
                  <Td className="text-slate-500">{m.genericName}</Td>
                  <Td><Badge variant="outline">{m.category}</Badge></Td>
                  <Td>
                    <span className={`font-semibold ${isLow ? "text-red-500" : "text-slate-700"}`}>
                      {m.currentStock} {m.unit}
                    </span>
                  </Td>
                  <Td className="text-slate-400">{m.minStockLevel} {m.unit}</Td>
                  <Td>PKR {m.unitCost?.toLocaleString()}</Td>
                  <Td>PKR {m.sellingPrice?.toLocaleString()}</Td>
                  <Td>
                    {m.expiryDate ? (
                      <span className={isExpiring ? "text-red-500 font-medium" : "text-slate-500"}>
                        {formatDate(m.expiryDate)}
                        {isExpiring && " ⚠️"}
                      </span>
                    ) : "—"}
                  </Td>
                  <Td>
                    <button
                      onClick={() => router.push(`/pharmacy/${m._id}`)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
        {pagination && pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex justify-end">
            <Pagination page={page} totalPages={pagination.totalPages} onPage={setPage} />
          </div>
        )}
      </Card>

      <MedicineCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}