import connectDB from "@/lib/db/mongoose";
import { Patient, IPatient } from "@/models/clinical.model";
import { FilterQuery, UpdateQuery } from "mongoose";
import { buildPagination, Pagination } from "@/lib/utils";

export interface FindPatientsOptions {
  search?: string;
  status?: string;
  bloodGroup?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: ReturnType<typeof buildPagination>;
}

export class PatientRepository {
  static async findMany(opts: FindPatientsOptions = {}): Promise<PaginatedResult<IPatient>> {
    await connectDB();
    const {
      search = "", status = "", bloodGroup = "",
      page = 1, limit = 20, sortBy = "createdAt", sortOrder = "desc",
    } = opts;

    const filter: FilterQuery<IPatient> = {};
    if (status) filter.status = status;
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: "i" } },
        { lastName: { $regex: search, $options: "i" } },
        { phone: { $regex: search, $options: "i" } },
        { patientId: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const sort: Record<string, 1 | -1> = { [sortBy]: sortOrder === "asc" ? 1 : -1 };

    const [data, total] = await Promise.all([
      Patient.find(filter).skip(skip).limit(limit).sort(sort).populate("registeredBy", "firstName lastName").lean(),
      Patient.countDocuments(filter),
    ]);

    return { data: data as IPatient[], pagination: buildPagination(total, page, limit) };
  }

  static async findById(id: string): Promise<IPatient | null> {
    await connectDB();
    return Patient.findById(id).populate("registeredBy", "firstName lastName email").lean() as Promise<IPatient | null>;
  }

  static async findByPatientId(patientId: string): Promise<IPatient | null> {
    await connectDB();
    return Patient.findOne({ patientId }).lean() as Promise<IPatient | null>;
  }

  static async create(data: Partial<IPatient> & { registeredBy: string }): Promise<IPatient> {
    await connectDB();
    const patient = await Patient.create(data);
    return patient.toObject() as IPatient;
  }

  static async update(id: string, data: UpdateQuery<IPatient>): Promise<IPatient | null> {
    await connectDB();
    return Patient.findByIdAndUpdate(id, data, { new: true }).lean() as Promise<IPatient | null>;
  }

  static async archive(id: string): Promise<IPatient | null> {
    await connectDB();
    return Patient.findByIdAndUpdate(id, { status: "archived" }, { new: true }).lean() as Promise<IPatient | null>;
  }

  static async countByStatus(): Promise<Record<string, number>> {
    await connectDB();
    const result = await Patient.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    return result.reduce((acc, r) => { acc[r._id] = r.count; return acc; }, {} as Record<string, number>);
  }
}
