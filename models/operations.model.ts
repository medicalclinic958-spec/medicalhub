import mongoose, { Schema, Document, Model } from "mongoose";

function getModel<T extends Document>(name: string, schema: Schema): Model<T> {
  return (mongoose.models[name] as Model<T>) || mongoose.model<T>(name, schema);
}

// ─── SUPPLIER MODEL ───────────────────────────────────────
export interface ISupplier extends Document {
  name: string;
  type: "company" | "individual";
  contactPerson?: string;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address?: string;
  taxId?: string;
  licenseNumber?: string;
  website?: string;
  paymentTerms?: string;
  bankName?: string;
  accountNumber?: string;
  categories?: string[];
  notes?: string;
  isActive: boolean;
}

const SupplierSchema = new Schema<ISupplier>(
  {
    name: { type: String, required: true, trim: true, index: true },
    type: { type: String, enum: ["company", "individual"], required: true, default: "company" },
    contactPerson: { type: String, trim: true },
    phone: { type: String, required: true, trim: true },
    alternatePhone: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, trim: true },
    taxId: { type: String, trim: true },
    licenseNumber: { type: String, trim: true },
    website: { type: String, trim: true },
    paymentTerms: { type: String, trim: true, default: "Net 30" },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    categories: [{ type: String, trim: true }],
    notes: { type: String, trim: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

SupplierSchema.index({ name: "text", contactPerson: "text" });

// ─── MEDICINE MODEL ───────────────────────────────────────
export interface IMedicine extends Document {
  name: string;
  genericName: string;
  category: string;
  manufacturer?: string;
  unit: string;
  currentStock: number;
  minStockLevel: number;
  unitCost: number;
  sellingPrice: number;
  batchNumber?: string;
  expiryDate?: Date;
  supplier?: mongoose.Types.ObjectId;
  storageCondition?: string;
  storageLocation?: string;
  isActive: boolean;
}

const MedicineSchema = new Schema<IMedicine>(
  {
    name: { type: String, required: true, trim: true, index: true },
    genericName: { type: String, required: true, trim: true },
    category: { type: String, required: true, index: true },
    manufacturer: { type: String },
    unit: { type: String, required: true, default: "tablet" },
    currentStock: { type: Number, required: true, default: 0 },
    minStockLevel: { type: Number, required: true, default: 10 },
    unitCost: { type: Number, required: true, default: 0 },
    sellingPrice: { type: Number, required: true, default: 0 },
    batchNumber: { type: String },
    expiryDate: { type: Date, index: true },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier" },
    storageCondition: { type: String, trim: true },
    storageLocation: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

MedicineSchema.index({ name: "text", genericName: "text" });

// ─── LAB TEST CATALOG MODEL ───────────────────────────────
export interface ILabCatalog extends Document {
  testName: string;
  testCode: string;
  category: string;
  cost: number;
  turnaroundTime: number; // hours
  isActive: boolean;
}

const LabCatalogSchema = new Schema<ILabCatalog>(
  {
    testName: { type: String, required: true, trim: true },
    testCode: { type: String, required: true, unique: true, uppercase: true },
    category: { type: String, required: true },
    cost: { type: Number, required: true, default: 0 },
    turnaroundTime: { type: Number, default: 24 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── LAB TEST ORDER MODEL ─────────────────────────────────
export interface ILabTest extends Document {
  labTestId: string;
  patient: mongoose.Types.ObjectId;
  requestedBy: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  tests: {
    catalogId: mongoose.Types.ObjectId;  // ← ADD THIS
    testName: string;
    testCode?: string;
    category: string;
    cost: number;
  }[];
  status: string;
  sampleCollectedAt?: Date;
  sampleCollectedBy?: mongoose.Types.ObjectId;
  processedBy?: mongoose.Types.ObjectId;
  completedAt?: Date;
  approvedBy?: mongoose.Types.ObjectId;
  results: {
    testName: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    isAbnormal?: boolean;
    notes?: string;
  }[];
  reportUrl?: string;
  notes?: string;
  priority: string;
  totalCost: number;
  isPaid: boolean;
}

const LabTestSchema = new Schema<ILabTest>(
  {
    labTestId: { type: String, unique: true },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", required: true, index: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment" },
    tests: [
      {
        catalogId: { type: Schema.Types.ObjectId, ref: "LabCatalog", required: true },  // ← ADD THIS
        testName: { type: String, required: true },
        testCode: String,
        category: { type: String, required: true },
        cost: { type: Number, default: 0 },
      },
    ],
    status: {
      type: String,
      enum: ["pending", "sample_collected", "processing", "completed", "delivered", "cancelled"],
      default: "pending",
      index: true,
    },
    sampleCollectedAt: Date,
    sampleCollectedBy: { type: Schema.Types.ObjectId, ref: "User" },
    processedBy: { type: Schema.Types.ObjectId, ref: "User" },
    completedAt: Date,
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    results: [
      {
        testName: { type: String, required: true },
        value: { type: String, required: true },
        unit: String,
        referenceRange: String,
        isAbnormal: { type: Boolean, default: false },
        notes: String,
      },
    ],
    reportUrl: String,
    notes: String,
    priority: { type: String, enum: ["routine", "urgent", "stat"], default: "routine" },
    totalCost: { type: Number, default: 0 },
    isPaid: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LabTestSchema.pre("save", async function () {
  if (!this.labTestId) {
    const count = await mongoose.models.LabTest.countDocuments();
    this.labTestId = `LAB-${String(count + 1).padStart(6, "0")}`;
  }
});

// ─── INVOICE MODEL ───────────────────────────────────────
export interface IInvoice extends Document {
  invoiceNumber: string;
  invoiceType: "opd" | "pharmacy_sale" | "pharmacy_purchase" | "lab" | "procedure" | "other";
  patient?: mongoose.Types.ObjectId;
  appointment?: mongoose.Types.ObjectId;
  supplier?: mongoose.Types.ObjectId;
  doctor?: mongoose.Types.ObjectId;
  items: {
    description: string;
    category: string;
    quantity: number;
    unitPrice: number;
    total: number;
    medicine?: mongoose.Types.ObjectId;
    batchNumber?: string;
  }[];
  subtotal: number;
  discount: number;
  discountType: "fixed" | "percentage";
  taxRate: number;
  taxAmount: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  status: "draft" | "pending" | "paid" | "partial" | "overdue" | "cancelled" | "refunded";
  payments: {
    amount: number;
    method: "cash" | "card" | "bank_transfer" | "mobile_wallet" | "insurance";
    transactionRef?: string;
    paidAt: Date;
    receivedBy: mongoose.Types.ObjectId;
    notes?: string;
  }[];
  dueDate?: Date;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, unique: true },
    invoiceType: {
      type: String,
      enum: ["opd", "pharmacy_sale", "pharmacy_purchase", "lab", "procedure", "other"],
      required: true,
      index: true,
    },
    patient: { type: Schema.Types.ObjectId, ref: "Patient", index: true },
    appointment: { type: Schema.Types.ObjectId, ref: "Appointment" },
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier" },
    doctor: { type: Schema.Types.ObjectId, ref: "User" },
    items: [
      {
        description: { type: String, required: true },
        category: {
          type: String,
          enum: ["consultation", "medicine", "lab_test", "procedure", "supplies", "other"],
          required: true,
        },
        quantity: { type: Number, required: true, default: 1 },
        unitPrice: { type: Number, required: true },
        total: { type: Number, required: true },
        medicine: { type: Schema.Types.ObjectId, ref: "Medicine" },
        batchNumber: String,
      },
    ],
    subtotal: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    discountType: { type: String, enum: ["fixed", "percentage"], default: "fixed" },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    paidAmount: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ["draft", "pending", "paid", "partial", "overdue", "cancelled", "refunded"],
      default: "pending",
      index: true,
    },
    payments: [
      {
        amount: { type: Number, required: true },
        method: {
          type: String,
          enum: ["cash", "card", "bank_transfer", "mobile_wallet", "insurance"],
          required: true,
        },
        transactionRef: String,
        paidAt: { type: Date, default: Date.now },
        receivedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
        notes: String,
      },
    ],
    dueDate: Date,
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

InvoiceSchema.pre("save", async function () {
  if (!this.invoiceNumber) {
    const count = await mongoose.models.Invoice.countDocuments({ invoiceType: this.invoiceType });
    const prefixes: Record<string, string> = {
      opd: "INV-OPD",
      pharmacy_sale: "INV-PHARM-SALE",
      pharmacy_purchase: "INV-PHARM-PURCH",
      lab: "INV-LAB",
      procedure: "INV-PROC",
      other: "INV-OTHER",
    };
    const prefix = prefixes[this.invoiceType] || "INV";
    this.invoiceNumber = `${prefix}-${String(count + 1).padStart(6, "0")}`;
  }
  this.balanceDue = this.total - this.paidAmount;
  if (this.balanceDue === 0 && this.total > 0) this.status = "paid";
  else if (this.paidAmount > 0 && this.balanceDue > 0) this.status = "partial";
});

// ─── EXPENSE MODEL ────────────────────────────────────────
export interface IExpense extends Document {
  title: string;
  category: string;
  amount: number;
  paymentMethod: string;
  vendor?: string;
  receiptUrl?: string;
  date: Date;
  description?: string;
  status: "pending" | "approved" | "rejected";
  approvedBy?: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    title: { type: String, required: true },
    category: {
      type: String,
      enum: ["salary", "utility", "purchase", "equipment", "maintenance", "other"],
      required: true,
      index: true,
    },
    amount: { type: Number, required: true },
    paymentMethod: {
      type: String,
      enum: ["cash", "card", "bank_transfer", "mobile_wallet", "insurance"],
      required: true,
    },
    vendor: String,
    receiptUrl: String,
    date: { type: Date, required: true, default: Date.now, index: true },
    description: String,
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

// ─── INVENTORY MODEL ──────────────────────────────────────
export interface IInventoryItem extends Document {
  name: string;
  category: string;
  sku?: string;
  currentQuantity: number;
  minQuantity: number;
  unit: string;
  unitCost: number;
  location?: string;
  supplier?: mongoose.Types.ObjectId;
  lastRestockedAt?: Date;
  isActive: boolean;
}

const InventorySchema = new Schema<IInventoryItem>(
  {
    name: { type: String, required: true, trim: true },
    category: { type: String, enum: ["equipment", "supply", "consumable"], required: true, index: true },
    sku: { type: String, unique: true, sparse: true },
    currentQuantity: { type: Number, required: true, default: 0 },
    minQuantity: { type: Number, required: true, default: 5 },
    unit: { type: String, required: true },
    unitCost: { type: Number, default: 0 },
    location: String,
    supplier: { type: Schema.Types.ObjectId, ref: "Supplier" },
    lastRestockedAt: Date,
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// ─── SETTINGS MODEL ───────────────────────────────────────
export interface ISettings extends Document {
  clinicName: string;
  clinicType: string;
  logo?: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    postalCode?: string;
  };
  phone: string;
  email: string;
  website?: string;
  registrationNumber?: string;
  taxId?: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  invoicePrefix: string;
  appointmentDuration: number;
  notificationSettings: {
    appointmentReminderHours: number;
    lowStockThreshold: number;
    emailEnabled: boolean;
    smsEnabled: boolean;
    whatsappEnabled: boolean;
  };
  updatedBy: mongoose.Types.ObjectId;
}

const SettingsSchema = new Schema<ISettings>(
  {
    clinicName: { type: String, required: true },
    clinicType: { type: String, enum: ["clinic", "hospital", "diagnostic_center"], default: "clinic" },
    logo: String,
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      postalCode: String,
    },
    phone: { type: String, required: true },
    email: { type: String, required: true },
    website: String,
    registrationNumber: String,
    taxId: String,
    currency: { type: String, default: "PKR" },
    timezone: { type: String, default: "Asia/Karachi" },
    dateFormat: { type: String, default: "DD/MM/YYYY" },
    invoicePrefix: { type: String, default: "INV" },
    appointmentDuration: { type: Number, default: 30 },
    notificationSettings: {
      appointmentReminderHours: { type: Number, default: 24 },
      lowStockThreshold: { type: Number, default: 10 },
      emailEnabled: { type: Boolean, default: false },
      smsEnabled: { type: Boolean, default: false },
      whatsappEnabled: { type: Boolean, default: false },
    },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export interface IReport extends Document {
  reportId: string;
  labTest: mongoose.Types.ObjectId;
  patient: {
    name: string;
    patientId: string;
    age: string;
    gender: string;
    bloodGroup?: string;
  };
  tests: {
    testName: string;
    testCode?: string;
    category: string;
    cost: number;
  }[];
  results: {
    testName: string;
    value: string;
    unit?: string;
    referenceRange?: string;
    isAbnormal?: boolean;
    notes?: string;
  }[];
  labTechnician: {
    name: string;
    signature: string;
  };
  additionalNotes?: string;
  status: "draft" | "final";
  reportUrl?: string;
  createdBy: mongoose.Types.ObjectId;
}

const ReportSchema = new Schema<IReport>(
  {
    reportId: { type: String, unique: true },
    labTest: { type: Schema.Types.ObjectId, ref: "LabTest", required: true },
    patient: {
      name: { type: String, required: true },
      patientId: { type: String, required: true },
      age: { type: String },
      gender: { type: String },
      bloodGroup: { type: String },
    },
    tests: [
      {
        testName: { type: String, required: true },
        testCode: String,
        category: String,
        cost: Number,
      },
    ],
    results: [
      {
        testName: { type: String, required: true },
        value: { type: String, required: true },
        unit: String,
        referenceRange: String,
        isAbnormal: { type: Boolean, default: false },
        notes: String,
      },
    ],
    labTechnician: {
      name: { type: String, required: true },
      signature: { type: String, required: true },
    },
    additionalNotes: { type: String },
    status: { type: String, enum: ["draft", "final"], default: "draft" },
    reportUrl: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ReportSchema.pre("save", async function () {
  if (!this.reportId) {
    const count = await mongoose.models.Report.countDocuments();
    this.reportId = `RPT-${String(count + 1).padStart(6, "0")}`;
  }
});

// ─── EXPORT MODELS ────────────────────────────────────────
export const Supplier = getModel<ISupplier>("Supplier", SupplierSchema);
export const Medicine = getModel<IMedicine>("Medicine", MedicineSchema);
export const LabCatalog = getModel<ILabCatalog>("LabCatalog", LabCatalogSchema);
export const LabTest = getModel<ILabTest>("LabTest", LabTestSchema);
export const Invoice = getModel<IInvoice>("Invoice", InvoiceSchema);
export const Expense = getModel<IExpense>("Expense", ExpenseSchema);
export const InventoryItem = getModel<IInventoryItem>("InventoryItem", InventorySchema);
export const Settings = getModel<ISettings>("Settings", SettingsSchema);
export const Report = getModel<IReport>("Report", ReportSchema);
