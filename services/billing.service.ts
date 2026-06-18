import connectDB from "@/lib/db/mongoose";
import { Invoice, IInvoice } from "@/models/operations.model";
import { auditLog } from "@/lib/auth/audit";

interface CreateInvoiceDTO {
  patient: string;
  appointment?: string;
  items: { description: string; category: string; quantity: number; unitPrice: number }[];
  discount?: number;
  discountType?: "fixed" | "percentage";
  tax?: number;
  notes?: string;
  dueDate?: string;
  createdBy: string;
}

interface AddPaymentDTO {
  amount: number;
  method: string;
  transactionRef?: string;
  notes?: string;
  receivedBy: string;
}

export class BillingService {
  /**
   * Calculate invoice totals from line items + discount + tax
   */
  static calculateTotals(
    items: { quantity: number; unitPrice: number }[],
    discount = 0,
    discountType: "fixed" | "percentage" = "fixed",
    tax = 0
  ) {
    const subtotal = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const discountAmount = discountType === "percentage" ? (subtotal * discount) / 100 : discount;
    const total = Math.max(0, subtotal - discountAmount + tax);
    return { subtotal, discountAmount, total };
  }

  /**
   * Create a new invoice
   */
  static async createInvoice(dto: CreateInvoiceDTO): Promise<IInvoice> {
    await connectDB();

    const items = dto.items.map(item => ({
      ...item,
      total: item.quantity * item.unitPrice,
    }));

    const { subtotal, total } = this.calculateTotals(
      dto.items,
      dto.discount,
      dto.discountType,
      dto.tax
    );

    const invoice = await Invoice.create({
      patient: dto.patient,
      appointment: dto.appointment,
      items,
      subtotal,
      discount: dto.discount || 0,
      discountType: dto.discountType || "fixed",
      tax: dto.tax || 0,
      total,
      paidAmount: 0,
      balanceDue: total,
      status: "pending",
      payments: [],
      notes: dto.notes,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      createdBy: dto.createdBy,
    });

    await auditLog({
      userId: dto.createdBy,
      action: "create",
      module: "billing",
      description: `Invoice ${invoice.invoiceNumber} created for PKR ${total}`,
      resourceId: invoice._id.toString(),
      resourceType: "Invoice",
    });

    return invoice.toObject() as IInvoice;
  }

  /**
   * Record a payment against an invoice
   */
  static async recordPayment(
    invoiceId: string,
    dto: AddPaymentDTO,
    userId: string
  ): Promise<IInvoice> {
    await connectDB();

    const invoice = await Invoice.findById(invoiceId);
    if (!invoice) throw new Error("Invoice not found");
    if (invoice.status === "paid" || invoice.status === "cancelled") {
      throw new Error("Cannot add payment to this invoice");
    }
    if (dto.amount > invoice.balanceDue) {
      throw new Error(`Payment (${dto.amount}) exceeds balance due (${invoice.balanceDue})`);
    }

    const newPaidAmount = invoice.paidAmount + dto.amount;
    const newBalance = invoice.total - newPaidAmount;
    const newStatus = newPaidAmount >= invoice.total ? "paid" : newPaidAmount > 0 ? "partial" : "pending";

    const updated = await Invoice.findByIdAndUpdate(
      invoiceId,
      {
        $push: {
          payments: {
            amount: dto.amount,
            method: dto.method,
            transactionRef: dto.transactionRef,
            notes: dto.notes,
            paidAt: new Date(),
            receivedBy: dto.receivedBy,
          },
        },
        paidAmount: newPaidAmount,
        balanceDue: newBalance,
        status: newStatus,
      },
      { new: true }
    )
      .populate("patient", "firstName lastName patientId")
      .populate("payments.receivedBy", "firstName lastName")
      .lean();

    await auditLog({
      userId,
      action: "update",
      module: "billing",
      description: `Payment of PKR ${dto.amount} recorded on invoice ${invoice.invoiceNumber}`,
      resourceId: invoiceId,
      resourceType: "Invoice",
    });

    return updated as unknown as IInvoice;
  }

  /**
   * Get revenue summary for a period
   */
  static async getRevenueSummary(from: Date, to: Date) {
    await connectDB();

    const [revenue, byCategory] = await Promise.all([
      Invoice.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to }, status: { $in: ["paid", "partial"] } } },
        {
          $group: {
            _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
            revenue: { $sum: "$paidAmount" },
            invoices: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      Invoice.aggregate([
        { $match: { createdAt: { $gte: from, $lte: to } } },
        { $unwind: "$items" },
        { $group: { _id: "$items.category", total: { $sum: "$items.total" } } },
        { $sort: { total: -1 } },
      ]),
    ]);

    return { daily: revenue, byCategory };
  }
}
