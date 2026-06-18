"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Calendar, Stethoscope, Receipt, FlaskConical } from "lucide-react";
import axios from "axios";
import { cn } from "@/lib/utils";

interface SearchResult {
  id: string;
  type: "patient" | "appointment" | "doctor" | "invoice";
  title: string;
  subtitle: string;
  href: string;
}

const TYPE_ICONS = {
  patient: Users,
  appointment: Calendar,
  doctor: Stethoscope,
  invoice: Receipt,
  lab: FlaskConical,
};

const TYPE_LABELS = {
  patient: "Patient",
  appointment: "Appointment",
  doctor: "Doctor",
  invoice: "Invoice",
  lab: "Lab",
};

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Keyboard shortcut: Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen(o => !o);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    try {
      const [pRes, aRes] = await Promise.allSettled([
        axios.get("/api/patients", { params: { search: q, limit: 5 } }),
        axios.get("/api/appointments", { params: { limit: 5 } }),
      ]);

      const combined: SearchResult[] = [];

      if (pRes.status === "fulfilled") {
        pRes.value.data.data?.forEach((p: Record<string, string>) => {
          combined.push({
            id: p._id, type: "patient",
            title: `${p.firstName} ${p.lastName}`,
            subtitle: `${p.patientId} • ${p.phone}`,
            href: `/patients/${p._id}`,
          });
        });
      }

      setResults(combined);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300);
    return () => clearTimeout(timer);
  }, [query, search]);

  const navigate = (href: string) => {
    router.push(href);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search patients, appointments, doctors..."
            className="flex-1 text-sm text-slate-800 placeholder:text-slate-400 outline-none"
          />
          <kbd className="text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded font-mono">ESC</kbd>
        </div>

        {(results.length > 0 || loading) && (
          <div className="max-h-64 overflow-y-auto">
            {loading ? (
              <div className="py-6 text-center text-sm text-slate-400">Searching...</div>
            ) : (
              results.map(r => {
                const Icon = TYPE_ICONS[r.type] || Search;
                return (
                  <button
                    key={r.id}
                    onClick={() => navigate(r.href)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <Icon className="w-3.5 h-3.5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{r.title}</p>
                      <p className="text-xs text-slate-400 truncate">{r.subtitle}</p>
                    </div>
                    <span className="text-xs text-slate-400 shrink-0">{TYPE_LABELS[r.type]}</span>
                  </button>
                );
              })
            )}
          </div>
        )}

        {query.length >= 2 && !loading && results.length === 0 && (
          <div className="py-8 text-center text-sm text-slate-400">No results for &ldquo;{query}&rdquo;</div>
        )}

        {query.length === 0 && (
          <div className="px-4 py-3 text-xs text-slate-400">
            Type to search patients, doctors, appointments...
          </div>
        )}

        <div className="px-4 py-2 border-t border-slate-100 flex gap-4">
          <span className="text-[10px] text-slate-400 flex items-center gap-1"><kbd className="bg-slate-100 px-1 rounded font-mono">↑↓</kbd> navigate</span>
          <span className="text-[10px] text-slate-400 flex items-center gap-1"><kbd className="bg-slate-100 px-1 rounded font-mono">↵</kbd> open</span>
          <span className="text-[10px] text-slate-400 flex items-center gap-1"><kbd className="bg-slate-100 px-1 rounded font-mono">ESC</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
