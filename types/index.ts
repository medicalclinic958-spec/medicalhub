// ============================================================
// CORE TYPES - Clinic/Hospital Management System
// ============================================================

import { Types } from "mongoose";

// ─── PERMISSIONS ──────────────────────────────────────────
export type PermissionAction = "view" | "create" | "update" | "delete" | "export" | "approve";
export type PermissionModule =
  | "patients"
  | "appointments"
  | "doctors"
  | "billing"
  | "lab"
  | "pharmacy"
  | "inventory"
  | "staff"
  | "reports"
  | "settings"
  | "users"
  | "roles"
  | "audit_logs"
  | "opd"
  | "emr"
  | "prescriptions"
  | "expenses";

export interface Permission {
  _id: string;
  module: PermissionModule;
  action: PermissionAction;
  description: string;
}

// ─── ROLES ────────────────────────────────────────────────
export interface Role {
  _id: string;
  name: string;
  slug: string;
  description: string;
  permissions: string[] | Permission[];
  isSystem: boolean; // super_admin role cannot be deleted
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

// ─── USERS ────────────────────────────────────────────────
export type UserStatus = "active" | "inactive" | "suspended" | "locked";

export interface User {
  _id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  password: string;
  phone: string;
  avatar?: string;
  role: string | Role;
  department?: string;
  status: UserStatus;
  isSuperAdmin: boolean;
  failedLoginAttempts: number;
  lockUntil?: Date;
  lastLogin?: Date;
  lastLoginIp?: string;
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  mustChangePassword: boolean;
  preferences: UserPreferences;
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  timezone: string;
  notifications: {
    email: boolean;
    browser: boolean;
  };
}

// ─── PATIENTS ─────────────────────────────────────────────
export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
export type Gender = "male" | "female" | "other";
export type PatientStatus = "active" | "archived" | "deceased";

export interface Patient {
  _id: string;
  patientId: string; // Auto-generated e.g. PT-000001
  firstName: string;
  lastName: string;
  fullName: string;
  gender: Gender;
  dateOfBirth: Date;
  age?: number; // computed
  phone: string;
  email?: string;
  address: Address;
  emergencyContact: EmergencyContact;
  bloodGroup?: BloodGroup;
  allergies: string[];
  chronicDiseases: string[];
  insuranceDetails?: InsuranceDetails;
  photo?: string; // Cloudinary URL
  status: PatientStatus;
  notes?: string;
  registeredBy: string | User;
  createdAt: Date;
  updatedAt: Date;
}

export interface Address {
  street?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
}

export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
}

export interface InsuranceDetails {
  provider: string;
  policyNumber: string;
  expiryDate?: Date;
  coverageDetails?: string;
}

// ─── DOCTORS ──────────────────────────────────────────────
export interface Doctor {
  _id: string;
  user: string | User;
  doctorId: string;
  specialization: string;
  qualifications: string[];
  experience: number; // years
  consultationFee: number;
  department: string | Department;
  availability: WeeklySchedule;
  bio?: string;
  languages: string[];
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface WeeklySchedule {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

export interface DaySchedule {
  isWorking: boolean;
  slots: TimeSlot[];
}

export interface TimeSlot {
  start: string; // "09:00"
  end: string;   // "17:00"
}

// ─── DEPARTMENTS ──────────────────────────────────────────
export interface Department {
  _id: string;
  name: string;
  code: string;
  description?: string;
  headDoctor?: string | Doctor;
  isActive: boolean;
  createdAt: Date;
}

// ─── APPOINTMENTS ─────────────────────────────────────────
export type AppointmentStatus =
  | "scheduled"
  | "checked_in"
  | "in_consultation"
  | "completed"
  | "cancelled"
  | "no_show";

export type AppointmentType = "opd" | "follow_up" | "emergency" | "teleconsultation";

export interface Appointment {
  _id: string;
  appointmentId: string;
  patient: string | Patient;
  doctor: string | Doctor;
  department: string | Department;
  type: AppointmentType;
  status: AppointmentStatus;
  scheduledDate: Date;
  scheduledTime: string;
  duration: number; // minutes
  chiefComplaint?: string;
  notes?: string;
  cancellationReason?: string;
  checkedInAt?: Date;
  completedAt?: Date;
  consultationFee: number;
  isPaid: boolean;
  createdBy: string | User;
  createdAt: Date;
  updatedAt: Date;
}

// ─── EMR / MEDICAL RECORDS ────────────────────────────────
export interface EMR {
  _id: string;
  patient: string | Patient;
  appointment: string | Appointment;
  doctor: string | Doctor;
  visitDate: Date;
  chiefComplaint: string;
  symptoms: string[];
  vitals: Vitals;
  diagnosis: Diagnosis[];
  treatmentPlan?: string;
  notes?: string;
  followUpDate?: Date;
  attachments: Attachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Vitals {
  temperature?: number; // °C
  bloodPressureSystolic?: number;
  bloodPressureDiastolic?: number;
  heartRate?: number; // bpm
  respiratoryRate?: number;
  oxygenSaturation?: number; // %
  weight?: number; // kg
  height?: number; // cm
  bmi?: number; // computed
  bloodSugar?: number;
}

export interface Diagnosis {
  icdCode?: string;
  description: string;
  type: "primary" | "secondary";
}

export interface Attachment {
  name: string;
  url: string;
  type: "report" | "scan" | "prescription" | "document" | "image";
  uploadedAt: Date;
}

// ─── PRESCRIPTIONS ────────────────────────────────────────
export interface Prescription {
  _id: string;
  prescriptionId: string;
  patient: string | Patient;
  doctor: string | Doctor;
  emr?: string | EMR;
  appointment?: string | Appointment;
  medicines: PrescribedMedicine[];
  notes?: string;
  status: "active" | "dispensed" | "cancelled";
  dispensedBy?: string | User;
  dispensedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PrescribedMedicine {
  medicineName: string;
  genericName?: string;
  dosage: string;      // e.g., "500mg"
  frequency: string;   // e.g., "3 times a day"
  duration: string;    // e.g., "7 days"
  route: string;       // e.g., "Oral"
  instructions?: string;
  quantity?: number;
}

// ─── LAB MANAGEMENT ───────────────────────────────────────
export type LabTestStatus = "pending" | "sample_collected" | "processing" | "completed" | "delivered" | "cancelled";

export interface LabTest {
  _id: string;
  labTestId: string;
  patient: string | Patient;
  requestedBy: string | Doctor;
  appointment?: string | Appointment;
  tests: TestItem[];
  status: LabTestStatus;
  sampleCollectedAt?: Date;
  sampleCollectedBy?: string | User;
  processedBy?: string | User;
  completedAt?: Date;
  approvedBy?: string | User;
  results: LabResult[];
  reportUrl?: string; // Cloudinary
  notes?: string;
  priority: "routine" | "urgent" | "stat";
  totalCost: number;
  isPaid: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestItem {
  testName: string;
  testCode?: string;
  category: string;
  cost: number;
}

export interface LabResult {
  testName: string;
  value: string;
  unit?: string;
  referenceRange?: string;
  isAbnormal?: boolean;
  notes?: string;
}

// ─── PHARMACY ─────────────────────────────────────────────
export interface Medicine {
  _id: string;
  name: string;
  genericName: string;
  category: string;
  manufacturer?: string;
  unit: string; // tablet, ml, mg, etc.
  currentStock: number;
  minStockLevel: number;
  unitCost: number;
  sellingPrice: number;
  batchNumber?: string;
  expiryDate?: Date;
  supplier?: string | Supplier;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Supplier {
  _id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email?: string;
  address?: string;
  isActive: boolean;
  createdAt: Date;
}

// ─── BILLING ──────────────────────────────────────────────
export type InvoiceStatus = "draft" | "pending" | "paid" | "partial" | "overdue" | "cancelled" | "refunded";
export type PaymentMethod = "cash" | "card" | "bank_transfer" | "mobile_wallet" | "insurance";

export interface Invoice {
  _id: string;
  invoiceNumber: string;
  patient: string | Patient;
  appointment?: string | Appointment;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  discountType: "fixed" | "percentage";
  tax: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  status: InvoiceStatus;
  payments: Payment[];
  notes?: string;
  dueDate?: Date;
  createdBy: string | User;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  description: string;
  category: "consultation" | "lab" | "pharmacy" | "procedure" | "room" | "other";
  quantity: number;
  unitPrice: number;
  total: number;
  reference?: string; // ID of related record
}

export interface Payment {
  amount: number;
  method: PaymentMethod;
  transactionRef?: string;
  paidAt: Date;
  receivedBy: string | User;
  notes?: string;
}

// ─── EXPENSES ─────────────────────────────────────────────
export type ExpenseCategory = "salary" | "utility" | "purchase" | "equipment" | "maintenance" | "other";

export interface Expense {
  _id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  paymentMethod: PaymentMethod;
  vendor?: string;
  receiptUrl?: string;
  date: Date;
  description?: string;
  approvedBy?: string | User;
  createdBy: string | User;
  createdAt: Date;
  updatedAt: Date;
}

// ─── INVENTORY ────────────────────────────────────────────
export interface InventoryItem {
  _id: string;
  name: string;
  category: "equipment" | "supply" | "consumable";
  sku?: string;
  currentQuantity: number;
  minQuantity: number;
  unit: string;
  unitCost: number;
  location?: string;
  supplier?: string | Supplier;
  lastRestockedAt?: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ─── NOTIFICATIONS ────────────────────────────────────────
export type NotificationType =
  | "appointment_reminder"
  | "low_stock"
  | "lab_result_ready"
  | "pending_payment"
  | "follow_up_reminder"
  | "system"
  | "prescription_ready";

export interface Notification {
  _id: string;
  user: string | User;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  priority: "low" | "medium" | "high";
  actionUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

// ─── AUDIT LOGS ───────────────────────────────────────────
export type AuditAction =
  | "login"
  | "logout"
  | "login_failed"
  | "create"
  | "update"
  | "delete"
  | "view"
  | "export"
  | "approve"
  | "password_reset"
  | "role_change"
  | "status_change";

export interface AuditLog {
  _id: string;
  user?: string | User;
  action: AuditAction;
  module: PermissionModule | "auth" | "system";
  description: string;
  resourceId?: string;
  resourceType?: string;
  previousData?: Record<string, unknown>;
  newData?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  status: "success" | "failure";
  createdAt: Date;
}

// ─── SETTINGS ─────────────────────────────────────────────
export interface ClinicSettings {
  _id: string;
  clinicName: string;
  clinicType: "clinic" | "hospital" | "diagnostic_center";
  logo?: string;
  address: Address;
  phone: string;
  email: string;
  website?: string;
  registrationNumber?: string;
  taxId?: string;
  departments: Department[];
  currency: string;
  timezone: string;
  dateFormat: string;
  invoicePrefix: string;
  appointmentDuration: number; // default minutes
  workingHours: WeeklySchedule;
  notificationSettings: {
    appointmentReminderHours: number;
    lowStockThreshold: number;
    emailEnabled: boolean;
    smsEnabled: boolean;
    whatsappEnabled: boolean;
  };
  updatedBy: string | User;
  updatedAt: Date;
}

// ─── API RESPONSE TYPES ───────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: Pagination;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface QueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  [key: string]: unknown;
}

// ─── AUTH TYPES ───────────────────────────────────────────
export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  roleSlug: string;
  permissions: string[];
  isSuperAdmin: boolean;
  avatar?: string;
  status: UserStatus;
}

// ─── DASHBOARD TYPES ──────────────────────────────────────
export interface DashboardStats {
  todayAppointments: number;
  totalPatients: number;
  totalDoctors: number;
  monthlyRevenue: number;
  pendingBills: number;
  labPending: number;
  recentActivities: RecentActivity[];
  appointmentsByStatus: Record<string, number>;
  revenueChart: RevenueDataPoint[];
}

export interface RecentActivity {
  id: string;
  type: string;
  description: string;
  user: string;
  timestamp: Date;
  module: string;
}

export interface RevenueDataPoint {
  date: string;
  revenue: number;
  expenses: number;
}
