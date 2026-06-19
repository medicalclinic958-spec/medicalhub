"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import axios from "axios";
import { useRouter } from "next/navigation";
import { Plus, Search, AlertTriangle, Eye, Box } from "lucide-react";
import {
  Card, CardBody, Table, Th, Td, Button, Modal,
  FormField, Input, Select, EmptyState, Pagination, Badge, Alert, StatCard,
} from "@/components/ui";
import { useSession } from "next-auth/react";
import { z } from "zod";

const createInventorySchema = z.object({
  name: z.string().min(1),
  category: z.enum(["equipment", "supply", "consumable"]),
  sku: z.string().optional(),
  currentQuantity: z.number().min(0),
  minQuantity: z.number().min(0),
  unit: z.string().min(1),
  unitCost: z.number().min(0),
  location: z.string().optional(),
  supplier: z.string().optional(),
});

type CreateInventoryInput = z.infer<typeof createInventorySchema>;

interface InventoryItem {
  _id: string; name: string; category: string; sku?: string;
  currentQuantity: number; minQuantity: number; unit: string;
  unitCost: number; location?: string; supplier?: { _id: string; name: string };
  isActive: boolean;
}

export function InventoryClient() {
  const { data: session } = useSession();
  const qc = useQueryClient();
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState("");

  const isSA = session?.user.isSuperAdmin;
  const perms = session?.user.permissions || [];
  const canCreate = isSA || perms.includes("inventory:create");

  const { data, isLoading } = useQuery({
    queryKey: ["inventory", page, search, category, lowStockOnly],
    queryFn: () => axios.get("/api/inventory", { params: { page, limit: 25, search, category, lowStock: lowStockOnly } }).then(r => r.data),
  });

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers-active"],
    queryFn: () => axios.get("/api/supplier", { params: { limit: 200, isActive: "true" } }).then(r => r.data),
    enabled: createOpen,
  });

  const items: InventoryItem[] = data?.data || [];
  const pagination = data?.pagination;
  const suppliers = suppliersData?.data || [];
  const lowStockItems = items.filter(i => i.currentQuantity <= i.minQuantity);

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateInventoryInput>({
    resolver: zodResolver(createInventorySchema),
    defaultValues: { category: "supply", currentQuantity: 0, minQuantity: 5, unitCost: 0 },
  });

  const createMutation = useMutation({
    mutationFn: (d: CreateInventoryInput) => axios.post("/api/inventory", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["inventory"] }); setCreateOpen(false); reset(); setCreateError(""); },
    onError: (e: unknown) => setCreateError((e as { response?: { data?: { error?: string } } })?.response?.data?.error || "Failed"),
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Inventory</h1>
          <p className="text-sm text-slate-500">{pagination?.total ?? 0} items</p>
        </div>
        {canCreate && <Button onClick={() => setCreateOpen(true)}><Plus className="w-4 h-4" /> Add Item</Button>}
      </div>

      {lowStockItems.length > 0 && (
        <Alert type="warning">{lowStockItems.length} item(s) below minimum quantity: {lowStockItems.map(i => i.name).join(", ")}</Alert>
      )}

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Total Items" value={pagination?.total ?? 0} icon={Box} color="blue" loading={isLoading} />
        <StatCard title="Low Stock" value={lowStockItems.length} icon={AlertTriangle} color="amber" loading={isLoading} />
        <StatCard title="Total Value" value={`PKR ${items.reduce((s, i) => s + (i.currentQuantity * i.unitCost), 0).toLocaleString()}`} icon={Box} color="emerald" loading={isLoading} />
      </div>

      <Card>
        <CardBody className="py-3">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input placeholder="Search inventory..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} className="pl-9" />
            </div>
            <Select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="w-36">
              <option value="">All types</option>
              <option value="equipment">Equipment</option>
              <option value="supply">Supply</option>
              <option value="consumable">Consumable</option>
            </Select>
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
            <tr><Th>Name</Th><Th>Category</Th><Th>SKU</Th><Th>Qty</Th><Th>Min Qty</Th><Th>Unit</Th><Th>Unit Cost</Th><Th>Location</Th><Th>Actions</Th></tr>
          </thead>
          <tbody>
            {isLoading ? (
              [...Array(8)].map((_, i) => <tr key={i}>{[...Array(9)].map((_, j) => <Td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></Td>)}</tr>)
            ) : items.length === 0 ? (
              <tr><td colSpan={9}><EmptyState title="No inventory items" action={canCreate ? <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="w-3.5 h-3.5" /> Add Item</Button> : undefined} /></td></tr>
            ) : items.map(item => {
              const isLow = item.currentQuantity <= item.minQuantity;
              return (
                <tr key={item._id} className={`hover:bg-slate-50 ${isLow ? "bg-amber-50/50" : ""}`}>
                  <Td><span className="font-medium text-slate-800">{item.name}</span>{isLow && <Badge variant="warning" className="ml-2">Low</Badge>}</Td>
                  <Td><Badge variant="outline" className="capitalize">{item.category}</Badge></Td>
                  <Td><span className="font-mono text-xs text-slate-400">{item.sku || "—"}</span></Td>
                  <Td><span className={`font-semibold ${isLow ? "text-red-500" : "text-slate-700"}`}>{item.currentQuantity}</span></Td>
                  <Td className="text-slate-400">{item.minQuantity}</Td>
                  <Td className="text-slate-500">{item.unit}</Td>
                  <Td>PKR {item.unitCost?.toLocaleString()}</Td>
                  <Td className="text-slate-400">{item.location || "—"}</Td>
                  <Td>
                    <button onClick={() => router.push(`/inventory/${item._id}`)} className="p-1.5 rounded-lg hover:bg-blue-50 text-slate-400 hover:text-blue-600 transition-all">
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

      <Modal open={createOpen} onClose={() => { setCreateOpen(false); reset(); setCreateError(""); }} title="Add Inventory Item" size="lg">
        {createError && <Alert type="error">{createError}</Alert>}
        <form onSubmit={handleSubmit(d => createMutation.mutate(d))} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Item Name" required error={errors.name?.message}>
              <Input {...register("name")} error={!!errors.name} />
            </FormField>
            <FormField label="Category" required error={errors.category?.message}>
              <Select {...register("category")} error={!!errors.category}>
                <option value="equipment">Equipment</option>
                <option value="supply">Supply</option>
                <option value="consumable">Consumable</option>
              </Select>
            </FormField>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <FormField label="Current Qty" required error={errors.currentQuantity?.message}>
              <Input type="number" {...register("currentQuantity", { valueAsNumber: true })} error={!!errors.currentQuantity} />
            </FormField>
            <FormField label="Min Qty" required error={errors.minQuantity?.message}>
              <Input type="number" {...register("minQuantity", { valueAsNumber: true })} error={!!errors.minQuantity} />
            </FormField>
            <FormField label="Unit" required error={errors.unit?.message}>
              <Input {...register("unit")} error={!!errors.unit} placeholder="pcs, boxes..." />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Unit Cost (PKR)" error={errors.unitCost?.message}>
              <Input type="number" {...register("unitCost", { valueAsNumber: true })} error={!!errors.unitCost} />
            </FormField>
            <FormField label="Location">
              <Input {...register("location")} placeholder="Storage room, shelf..." />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="SKU">
              <Input {...register("sku")} placeholder="Optional barcode/SKU" />
            </FormField>
            <FormField label="Supplier">
              <Select {...register("supplier")}>
                <option value="">Select supplier (optional)</option>
                {suppliers.map((s: { _id: string; name: string; type: string }) => (
                  <option key={s._id} value={s._id}>{s.name} ({s.type})</option>
                ))}
              </Select>
            </FormField>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button type="button" variant="secondary" onClick={() => { setCreateOpen(false); reset(); }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Add Item</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}