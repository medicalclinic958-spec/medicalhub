"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Plus, Search, AlertTriangle, Eye } from "lucide-react";
import {
  Card, CardBody, Table, Th, Td, Button, Modal,
  FormField, Input, Select, EmptyState, Pagination, Badge, Alert, StatCard,
} from "@/components/ui";
import { createMedicineSchema, CreateMedicineInput } from "@/lib/validations";
import { formatDate } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { Pill } from "lucide-react";

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
  const [createError, setCreateError] = useState("");

  const isSA = session?.user.isSuperAdmin;
  const perms = session?.user.permissions || [];
  const canCreate = isSA || perms.includes("pharmacy:create");

  const { data, isLoading } = useQuery({
    queryKey: ["medicines", page, search, lowStockOnly],
    queryFn: () => axios.get("/api/pharmacy", { params: { page, limit: 25, search, lowStock: lowStockOnly } }).then(r => r.data),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-active"],
    queryFn: () => axios.get("/api/supplier", { params: { limit: 200, isActive: "true" } }).then(r => r.data),
    enabled: createOpen,
  });

  const medicines: Medicine[] = data?.data || [];
  const pagination = data?.pagination;
  const suppliers = suppliersData?.data || [];
  const lowStockCount = medicines.filter(m => m.currentStock <= m.minStockLevel).length;

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateMedicineInput>({
    resolver: zodResolver(createMedicineSchema),
  });

  const createMutation = useMutation({
    mutationFn: (d: CreateMedicineInput) => axios.post("/api/pharmacy", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["medicines"] }); setCreateOpen(false); reset(); setCreateError(""); },
    onError: (e: unknown) => setCreateError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Pharmacy</h1>
          <p className="text-sm text-slate-500">{pagination?.total ?? 0} medicines in inventory</p>
        </div>
        {canCreate && <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> Add Medicine</Button>}
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
              <Input placeholder="Search medicines..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input type="checkbox" checked={lowStockOnly} onChange={e => { setLowStockOnly(e.target.checked); setPage(1); }} className="rounded" />
              Low stock only
            </label>
          </div>
        </CardBody>
      </Card>

      <Card>
        <Table>
          <thead>
            <tr><Th>Name</Th><Th>Generic</Th><Th>Category</Th><Th>Stock</Th><Th>Min</Th><Th>Unit Cost</Th><Th>Selling</Th><Th>Expiry</Th><Th>Actions</Th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => <tr key={i}>{[...Array(9)].map((_, j) => <Td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></Td>)}</tr>)
            ) : medicines.length === 0 ? (
              <tr><td colSpan={9}><EmptyState title="No medicines found" action={canCreate ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-3.5 h-3.5" /> Add Medicine</Button> : undefined} /></td></tr>
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
                    <button onClick={() => router.push(`/pharmacy/${m._id}`)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all">
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

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset(); setCreateError(""); }} title="Add Medicine" size="lg">
        {createError && <Alert type="error">{createError}</Alert>}
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Brand Name" required error={errors.name?.message}><Input {...register("name")} error={!!errors.name} /></FormField>
            <FormField label="Generic Name" required error={errors.genericName?.message}><Input {...register("genericName")} error={!!errors.genericName} /></FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Category" required error={errors.category?.message}>
              <Select {...register("category")} error={!!errors.category}>
                <option value="">Select</option>
                {["Antibiotic", "Analgesic", "Antihypertensive", "Antidiabetic", "Antacid", "Vitamin", "Steroid", "Antihistamine", "Other"].map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="Unit" required error={errors.unit?.message}>
              <Select {...register("unit")} error={!!errors.unit}>
                <option value="">Select</option>
                {["tablet", "capsule", "ml", "mg", "syrup", "injection", "cream", "drops", "inhaler", "sachet"].map(u => <option key={u} value={u}>{u}</option>)}
              </Select>
            </FormField>
            <FormField label="Manufacturer"><Input {...register("manufacturer")} /></FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Current Stock" required error={errors.currentStock?.message}><Input type="number" {...register("currentStock", { valueAsNumber: true })} error={!!errors.currentStock} /></FormField>
            <FormField label="Min Stock Level" required error={errors.minStockLevel?.message}><Input type="number" {...register("minStockLevel", { valueAsNumber: true })} error={!!errors.minStockLevel} /></FormField>
            <FormField label="Expiry Date"><Input type="date" {...register("expiryDate")} /></FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Storage Condition">
              <Select {...register("storageCondition")}>
                <option value="">Select</option>
                {["Room Temperature", "Refrigerated (2-8°C)", "Cool & Dry Place", "Freezer", "Protect from Light", "Other"].map(c => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>
            <FormField label="Storage Location">
              <Input {...register("storageLocation")} placeholder="e.g., Shelf A-1, Window 1, Cold Storage 2" />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Unit Cost (PKR)" required error={errors.unitCost?.message}><Input type="number" {...register("unitCost", { valueAsNumber: true })} error={!!errors.unitCost} /></FormField>
            <FormField label="Selling Price (PKR)" required error={errors.sellingPrice?.message}><Input type="number" {...register("sellingPrice", { valueAsNumber: true })} error={!!errors.sellingPrice} /></FormField>
          </div>
          <FormField label="Supplier">
            <Select {...register("supplier")}>
              <option value="">Select supplier (optional)</option>
              {suppliers.map((s: { _id: string; name: string; type: string }) => (
                <option key={s._id} value={s._id}>{s.name} ({s.type})</option>
              ))}
            </Select>
          </FormField>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Add Medicine</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}