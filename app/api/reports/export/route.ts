import { NextRequest } from "next/server";
import { auth } from "@/lib/auth/auth.config";
import connectDB from "@/lib/db/mongoose";
import { Invoice } from "@/models/operations.model";
import { Patient } from "@/models/clinical.model";
import { Appointment } from "@/models/clinical.model";
import { Expense } from "@/models/operations.model";
import { apiError } from "@/lib/utils";
import { hasPermission, auditLog } from "@/lib/auth/audit";
import { NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return apiError("Unauthorized", 401);
  if (!hasPermission(session.user.permissions, session.user.isSuperAdmin, "reports", "export")) {
    return apiError("Forbidden — export permission required", 403);
  }

  await connectDB();
  const sp = req.nextUrl.searchParams;
  const format = sp.get("format") || "csv"; // csv | json
  const type = sp.get("type") || "revenue";
  const from = sp.get("from") ? new Date(sp.get("from")!) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const to = sp.get("to") ? new Date(sp.get("to")!) : new Date();

  let data: Record<string, unknown>[] = [];
  let filename = `report-${type}-${new Date().toISOString().split("T")[0]}`;

  switch (type) {
    case "revenue": {
      const invoices = await Invoice.find({
        createdAt: { $gte: from, $lte: to },
      })
        .populate("patient", "firstName lastName patientId")
        .lean();
      data = invoices.map(inv => ({
        "Invoice #": (inv as Record<string, unknown>).invoiceNumber,
        Patient: `${(inv.patient as Record<string, string>)?.firstName} ${(inv.patient as Record<string, string>)?.lastName}`,
        "Patient ID": (inv.patient as Record<string, string>)?.patientId,
        "Total (PKR)": (inv as Record<string, unknown>).total,
        "Paid (PKR)": (inv as Record<string, unknown>).paidAmount,
        "Balance (PKR)": (inv as Record<string, unknown>).balanceDue,
        Status: (inv as Record<string, unknown>).status,
        Date: new Date((inv as Record<string, unknown>).createdAt as Date).toLocaleDateString(),
      }));
      filename = `revenue-report-${from.toISOString().split("T")[0]}-to-${to.toISOString().split("T")[0]}`;
      break;
    }

    case "patients": {
      const patients = await Patient.find({ createdAt: { $gte: from, $lte: to } }).lean();
      data = patients.map(p => ({
        "Patient ID": (p as Record<string, unknown>).patientId,
        "First Name": (p as Record<string, unknown>).firstName,
        "Last Name": (p as Record<string, unknown>).lastName,
        Gender: (p as Record<string, unknown>).gender,
        Phone: (p as Record<string, unknown>).phone,
        "Blood Group": (p as Record<string, unknown>).bloodGroup || "",
        Status: (p as Record<string, unknown>).status,
        Registered: new Date((p as Record<string, unknown>).createdAt as Date).toLocaleDateString(),
      }));
      filename = `patients-${from.toISOString().split("T")[0]}-to-${to.toISOString().split("T")[0]}`;
      break;
    }

    case "appointments": {
      const appointments = await Appointment.find({ scheduledDate: { $gte: from, $lte: to } })
        .populate("patient", "firstName lastName patientId")
        .populate({ path: "doctor", populate: { path: "user", select: "firstName lastName" } })
        .lean();
      data = appointments.map(a => ({
        "Appointment ID": (a as Record<string, unknown>).appointmentId,
        Patient: `${(a.patient as Record<string, string>)?.firstName} ${(a.patient as Record<string, string>)?.lastName}`,
        Doctor: `${((a.doctor as Record<string, Record<string, string>>)?.user)?.firstName} ${((a.doctor as Record<string, Record<string, string>>)?.user)?.lastName}`,
        Date: new Date((a as Record<string, unknown>).scheduledDate as Date).toLocaleDateString(),
        Time: (a as Record<string, unknown>).scheduledTime,
        Type: (a as Record<string, unknown>).type,
        Status: (a as Record<string, unknown>).status,
        "Fee (PKR)": (a as Record<string, unknown>).consultationFee,
      }));
      filename = `appointments-${from.toISOString().split("T")[0]}-to-${to.toISOString().split("T")[0]}`;
      break;
    }

    case "expenses": {
      const expenses = await Expense.find({ date: { $gte: from, $lte: to } })
        .populate("createdBy", "firstName lastName")
        .lean();
      data = expenses.map(e => ({
        Title: (e as Record<string, unknown>).title,
        Category: (e as Record<string, unknown>).category,
        "Amount (PKR)": (e as Record<string, unknown>).amount,
        Method: (e as Record<string, unknown>).paymentMethod,
        Vendor: (e as Record<string, unknown>).vendor || "",
        Date: new Date((e as Record<string, unknown>).date as Date).toLocaleDateString(),
        "Added By": `${(e.createdBy as Record<string, string>)?.firstName} ${(e.createdBy as Record<string, string>)?.lastName}`,
      }));
      filename = `expenses-${from.toISOString().split("T")[0]}-to-${to.toISOString().split("T")[0]}`;
      break;
    }

    default:
      return apiError("Invalid report type", 400);
  }

  await auditLog({
    userId: session.user.id,
    action: "export",
    module: "reports",
    description: `Exported ${type} report (${format.toUpperCase()}) — ${data.length} rows`,
    status: "success",
  });

  if (format === "json") {
    return NextResponse.json(data, {
      headers: { "Content-Disposition": `attachment; filename="${filename}.json"` },
    });
  }

  // CSV export
  if (data.length === 0) {
    return new NextResponse("No,Data\n", {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="${filename}.csv"`,
      },
    });
  }

  const headers = Object.keys(data[0]);
  const rows = [
    headers.join(","),
    ...data.map(row =>
      headers.map(h => {
        const val = String(row[h] ?? "");
        return val.includes(",") ? `"${val}"` : val;
      }).join(",")
    ),
  ].join("\n");

  return new NextResponse(rows, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}.csv"`,
    },
  });
}
