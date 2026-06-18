import { create } from "zustand";

// ─── UI STORE ─────────────────────────────────────────────
interface UIState {
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
  toggleSidebar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
}));

// ─── NOTIFICATION STORE ───────────────────────────────────
interface Toast {
  id: string;
  type: "success" | "error" | "warning" | "info";
  message: string;
}

interface NotificationState {
  toasts: Toast[];
  addToast: (type: Toast["type"], message: string) => void;
  removeToast: (id: string) => void;
  clearToasts: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  toasts: [],
  addToast: (type, message) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ toasts: [...s.toasts, { id, type, message }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  clearToasts: () => set({ toasts: [] }),
}));

// ─── PATIENT STORE (active patient context) ───────────────
interface PatientState {
  activePatientId: string | null;
  setActivePatient: (id: string | null) => void;
}

export const usePatientStore = create<PatientState>((set) => ({
  activePatientId: null,
  setActivePatient: (id) => set({ activePatientId: id }),
}));

// ─── MODAL STORE ──────────────────────────────────────────
interface ModalState {
  modals: Record<string, boolean>;
  openModal: (key: string) => void;
  closeModal: (key: string) => void;
  toggleModal: (key: string) => void;
  isOpen: (key: string) => boolean;
}

export const useModalStore = create<ModalState>((set, get) => ({
  modals: {},
  openModal: (key) => set((s) => ({ modals: { ...s.modals, [key]: true } })),
  closeModal: (key) => set((s) => ({ modals: { ...s.modals, [key]: false } })),
  toggleModal: (key) => set((s) => ({ modals: { ...s.modals, [key]: !s.modals[key] } })),
  isOpen: (key) => get().modals[key] ?? false,
}));
