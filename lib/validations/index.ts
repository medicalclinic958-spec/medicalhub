import { z } from "zod";

// ─── AUTH SCHEMAS ─────────────────────────────────────────
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Must contain uppercase letter")
      .regex(/[a-z]/, "Must contain lowercase letter")
      .regex(/[0-9]/, "Must contain number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("Invalid email address"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ─── USER SCHEMAS ─────────────────────────────────────────
export const createUserSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Valid phone number required"),
  role: z.string().min(1, "Role is required"),
  department: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  mustChangePassword: z.boolean().optional(),
});

export const updateUserSchema = createUserSchema
  .omit({ password: true })
  .partial();

// ─── ROLE SCHEMAS ─────────────────────────────────────────
export const createRoleSchema = z.object({
  name: z.string().min(1, "Role name is required").max(50),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, "Select at least one permission"),
});

export const updateRoleSchema = createRoleSchema.partial();

// ─── PATIENT SCHEMAS ──────────────────────────────────────
export const createPatientSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(50),
  lastName: z.string().min(1, "Last name is required").max(50),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  phone: z.string().min(10, "Valid phone number required"),
  email: z.string().email().optional().or(z.literal("")),
  address: z
    .object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      country: z.string().optional(),
      postalCode: z.string().optional(),
    })
    .optional(),
  emergencyContact: z
    .object({
      name: z.string().optional(),
      relationship: z.string().optional(),
      phone: z.string().optional(),
    })
    .optional(),
  bloodGroup: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"])
    .optional()
    .or(z.literal("")),
  allergies: z.array(z.string()).optional(),
  chronicDiseases: z.array(z.string()).optional(),
  notes: z.string().optional(),
  insuranceDetails: z
    .object({
      provider: z.string().optional(),
      policyNumber: z.string().optional(),
      expiryDate: z.string().optional(),
      coverageDetails: z.string().optional(),
    })
    .optional(),
});

export const updatePatientSchema = z.object({
  firstName: z.string().min(1, "First name required"),
  lastName: z.string().min(1, "Last name required"),
  gender: z.enum(["male", "female", "other"]),
  dateOfBirth: z.string().min(1, "Date of birth required"),
  phone: z.string().min(1, "Phone number required"),
  email: z.string().email().optional().or(z.literal("")),
  bloodGroup: z.string().optional(),
  notes: z.string().optional(),
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
  }).optional(),
  emergencyContact: z.object({
    name: z.string().optional(),
    relationship: z.string().optional(),
    phone: z.string().optional(),
  }).optional(),
  allergies: z.array(z.string()).optional(),
  chronicDiseases: z.array(z.string()).optional(),
  insuranceDetails: z
    .object({
      provider: z.string().optional(),
      policyNumber: z.string().optional(),
      expiryDate: z.string().optional(),
      coverageDetails: z.string().optional(),
    })
    .optional(),
  dateOfDeath: z.string().optional(),
  causeOfDeath: z.string().optional(),
  status: z.enum(["active", "archived", "deceased"]).default("active"),
}).partial();

export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;

// ─── APPOINTMENT SCHEMAS ──────────────────────────────────
export const createAppointmentSchema = z.object({
  patient: z.string().min(1, "Patient is required"),
  doctor: z.string().min(1, "Doctor is required"),
  department: z.string().optional(),
  type: z.enum(["opd", "follow_up", "emergency", "teleconsultation"]),
  scheduledDate: z.string().min(1, "Appointment date is required"),
  scheduledTime: z.string().min(1, "Appointment time is required"),
  duration: z.number().min(5).max(180).default(30),
  chiefComplaint: z.string().optional(),
  notes: z.string().optional(),
  consultationFee: z.number().min(0).default(0),
});

export const updateAppointmentSchema = z.object({
  status: z
    .enum(["scheduled", "checked_in", "in_consultation", "completed", "cancelled", "no_show"])
    .optional(),
  scheduledDate: z.string().optional(),
  scheduledTime: z.string().optional(),
  cancellationReason: z.string().optional(),
  notes: z.string().optional(),
});

// ─── EMR SCHEMAS ──────────────────────────────────────────
export const createEMRSchema = z.object({
  patient: z.string().min(1, "Patient is required"),
  chiefComplaint: z.string().min(1, "Chief complaint is required"),
  appointment: z.string().optional(),
  symptoms: z.array(z.string()).optional(),
  vitals: z.object({
    temperature: z.number().optional(),
    bloodPressureSystolic: z.number().optional(),
    bloodPressureDiastolic: z.number().optional(),
    heartRate: z.number().optional(),
    respiratoryRate: z.number().optional(),
    oxygenSaturation: z.number().optional(),
    weight: z.number().optional(),
    height: z.number().optional(),
    bloodSugar: z.number().optional(),
  }).optional(),
  diagnosis: z.array(z.object({
    icdCode: z.string().optional(),
    description: z.string().min(1, "Diagnosis description is required"),
    type: z.enum(["primary", "secondary"]).default("primary"),
  })).optional(),
  treatmentPlan: z.string().optional(),
  notes: z.string().optional(),
  followUpDate: z.string().optional(),
  // Add prescription fields
  prescriptions: z.array(z.object({
    medicine: z.string().min(1, "Medicine name is required"),
    strength: z.string().optional(),
    dosage: z.string().min(1, "Dosage is required"),
    frequency: z.string().min(1, "Frequency is required"),
    duration: z.string().optional(),
    route: z.string().default("oral"),
    instructions: z.string().optional(),
    quantity: z.number().optional(),
  })).optional(),
  prescriptionNotes: z.string().optional(),
  prescriptionType: z.enum(["new", "refill", "renewal"]).default("new"),
  durationValue: z.number().default(5),
  durationUnit: z.enum(["days", "weeks", "months"]).default("days"),
  allergies: z.array(z.string()).optional(),
});

// ─── PRESCRIPTION SCHEMAS ─────────────────────────────────
export const createPrescriptionSchema = z.object({
  patient: z.string().min(1),
  appointment: z.string().optional(),
  emr: z.string().optional(),
  medicines: z
    .array(
      z.object({
        medicineName: z.string().min(1, "Medicine name is required"),
        genericName: z.string().optional(),
        dosage: z.string().min(1, "Dosage is required"),
        frequency: z.string().min(1, "Frequency is required"),
        duration: z.string().min(1, "Duration is required"),
        route: z.string().default("Oral"),
        instructions: z.string().optional(),
        quantity: z.number().optional(),
      })
    )
    .min(1, "At least one medicine is required"),
  notes: z.string().optional(),
});

// ─── LAB TEST SCHEMAS ─────────────────────────────────────
export const createLabTestSchema = z.object({
  patient: z.string().min(1, "Patient is required"),
  appointment: z.string().optional(),
  tests: z
    .array(
      z.object({
        catalogId: z.string().min(1, "Catalog ID is required"),
      })
    )
    .min(1, "At least one test is required"),
  priority: z.enum(["routine", "urgent", "stat"]).default("routine"),
  notes: z.string().optional(),
});

// ─── BILLING SCHEMAS ──────────────────────────────────────
export const createInvoiceSchema = z.object({
  invoiceType: z.enum(["opd", "pharmacy_sale", "pharmacy_purchase", "lab", "procedure", "other"]),
  patient: z.string().optional(),
  appointment: z.string().optional(),
  supplier: z.string().optional(),
  doctor: z.string().optional(),
  items: z.array(z.object({
    description: z.string().min(1),
    category: z.enum(["consultation", "medicine", "lab_test", "procedure", "supplies", "other"]),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    total: z.number().min(0),
    medicine: z.string().optional(),
    batchNumber: z.string().optional(),
  })),
  subtotal: z.number().min(0),
  discount: z.number().min(0).default(0),
  discountType: z.enum(["fixed", "percentage"]).default("fixed"),
  taxRate: z.number().min(0).default(0),
  taxAmount: z.number().min(0).default(0),
  total: z.number().min(0),
  paidAmount: z.number().min(0).default(0),
  status: z.enum(["draft", "pending", "paid", "partial", "overdue", "cancelled", "refunded"]).default("pending"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

export const updateInvoiceSchema = z.object({
  items: z.array(z.object({
    description: z.string().min(1),
    category: z.enum(["consultation", "medicine", "lab_test", "procedure", "supplies", "other"]),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    total: z.number().min(0),
    medicine: z.string().optional(),
    batchNumber: z.string().optional(),
  })).optional(),
  subtotal: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  discountType: z.enum(["fixed", "percentage"]).optional(),
  taxRate: z.number().min(0).optional(),
  taxAmount: z.number().min(0).optional(),
  total: z.number().min(0).optional(),
  paidAmount: z.number().min(0).optional(),
  status: z.enum(["draft", "pending", "paid", "partial", "overdue", "cancelled", "refunded"]).optional(),
  payments: z.array(z.object({
    amount: z.number().min(1),
    method: z.enum(["cash", "card", "bank_transfer", "mobile_wallet", "insurance"]),
    transactionRef: z.string().optional(),
    receivedBy: z.string(),
    notes: z.string().optional(),
  })).optional(),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
});

// ─── LAB CATALOG SCHEMAS ──────────────────────────────────
export const createLabCatalogSchema = z.object({
  testName: z.string().min(1, "Test name is required").max(200, "Test name must be under 200 characters"),
  testCode: z.string().min(1, "Test code is required").max(20, "Test code must be under 20 characters"),
  category: z.string().min(1, "Category is required"),
  cost: z.number().min(0, "Cost cannot be negative"),
  turnaroundTime: z.number().min(0, "Turnaround time cannot be negative").default(24),
  isActive: z.union([z.boolean(), z.string()]).optional(),
});

export const updateLabCatalogSchema = z.object({
  testName: z.string().min(1).max(200).optional(),
  testCode: z.string().min(1).max(20).optional(),
  category: z.string().min(1).optional(),
  cost: z.number().min(0).optional(),
  turnaroundTime: z.number().min(0).optional(),
  isActive: z.union([z.boolean(), z.string()]).optional(),
});

export const addPaymentSchema = z.object({
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  method: z.enum(["cash", "card", "bank_transfer", "mobile_wallet", "insurance"]),
  transactionRef: z.string().optional(),
  notes: z.string().optional(),
});

// ─── MEDICINE SCHEMAS ─────────────────────────────────────
export const createMedicineSchema = z.object({
  name: z.string().min(1),
  genericName: z.string().min(1),
  category: z.string().min(1),
  manufacturer: z.string().optional(),
  unit: z.string().min(1),
  currentStock: z.number().min(0),
  minStockLevel: z.number().min(0),
  unitCost: z.number().min(0),
  sellingPrice: z.number().min(0),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  supplier: z.string().optional(),
  storageCondition: z.string().optional(),
  storageLocation: z.string().optional(),
});
// Add to lib/validations.ts
export const updateMedicineSchema = z.object({
  name: z.string().min(1).optional(),
  genericName: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  manufacturer: z.string().optional(),
  unit: z.string().min(1).optional(),
  currentStock: z.number().min(0).optional(),
  minStockLevel: z.number().min(0).optional(),
  unitCost: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  batchNumber: z.string().optional(),
  expiryDate: z.string().optional(),
  supplier: z.string().optional(),
  storageCondition: z.string().optional(),
  storageLocation: z.string().optional(),
  isActive: z.boolean().optional(),
});

// ─── EXPENSE SCHEMAS ──────────────────────────────────────
export const createExpenseSchema = z.object({
  title: z.string().min(1),
  category: z.enum(["salary", "utility", "purchase", "equipment", "maintenance", "other"]),
  amount: z.number().min(0.01),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "mobile_wallet", "insurance"]),
  vendor: z.string().optional(),
  receiptUrl: z.string().optional(),
  date: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export const updateExpenseSchema = z.object({
  title: z.string().min(1).optional(),
  category: z.enum(["salary", "utility", "purchase", "equipment", "maintenance", "other"]).optional(),
  amount: z.number().min(0.01).optional(),
  paymentMethod: z.enum(["cash", "card", "bank_transfer", "mobile_wallet", "insurance"]).optional(),
  vendor: z.string().optional(),
  receiptUrl: z.string().optional(),
  date: z.string().optional(),
  description: z.string().optional(),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
  approvedBy: z.string().optional(),
});


// ─── SETTINGS SCHEMAS ─────────────────────────────────────
export const updateSettingsSchema = z.object({
  clinicName: z.string().min(1).optional(),
  clinicType: z.enum(["clinic", "hospital", "diagnostic_center"]).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional().or(z.literal("")),
  registrationNumber: z.string().optional(),
  taxId: z.string().optional(),
  currency: z.string().optional(),
  timezone: z.string().optional(),
  invoicePrefix: z.string().optional(),
  appointmentDuration: z.number().min(5).max(120).optional(),
});

export const createReportSchema = z.object({
  labTestId: z.string().min(1, "Lab test ID is required"),
  labTechnician: z.object({
    name: z.string().min(1, "Technician name is required"),
    signature: z.string().min(1, "Signature is required"),
  }),
  additionalNotes: z.string().optional(),
});

// ─── VALIDATIONS (add to lib/validations.ts) ──────────────
export const createSupplierSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["company", "individual"]),
  contactPerson: z.string().optional(),
  phone: z.string().min(1),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  taxId: z.string().optional(),
  licenseNumber: z.string().optional(),
  website: z.string().optional(),
  paymentTerms: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  categories: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

export const updateSupplierSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["company", "individual"]).optional(),
  contactPerson: z.string().optional(),
  phone: z.string().min(1).optional(),
  alternatePhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal("")),
  address: z.string().optional(),
  taxId: z.string().optional(),
  licenseNumber: z.string().optional(),
  website: z.string().optional(),
  paymentTerms: z.string().optional(),
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  categories: z.array(z.string()).optional(),
  notes: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Type exports
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type CreateEMRInput = z.infer<typeof createEMRSchema>;
export type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>;
export type CreateMedicineInput = z.infer<typeof createMedicineSchema>;
export type UpdateMedicineInput = z.infer<typeof updateMedicineSchema>;
export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;
export type UpdateInvoiceInput = z.infer<typeof updateInvoiceSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>;

