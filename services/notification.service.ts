import connectDB from "@/lib/db/mongoose";
import { Notification } from "@/models/user.model";

export type NotificationType =
  | "appointment_reminder"
  | "low_stock"
  | "lab_result_ready"
  | "pending_payment"
  | "follow_up_reminder"
  | "system"
  | "prescription_ready";

interface CreateNotificationDTO {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  priority?: "low" | "medium" | "high";
  actionUrl?: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  /**
   * Create a notification for a specific user
   */
  static async create(dto: CreateNotificationDTO): Promise<void> {
    await connectDB();
    await Notification.create({
      user: dto.userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      priority: dto.priority || "medium",
      actionUrl: dto.actionUrl,
      metadata: dto.metadata,
      isRead: false,
    });
  }

  /**
   * Create notifications for multiple users
   */
  static async createBulk(
    userIds: string[],
    dto: Omit<CreateNotificationDTO, "userId">
  ): Promise<void> {
    await connectDB();
    const notifications = userIds.map(userId => ({
      user: userId,
      type: dto.type,
      title: dto.title,
      message: dto.message,
      priority: dto.priority || "medium",
      actionUrl: dto.actionUrl,
      metadata: dto.metadata,
      isRead: false,
    }));
    await Notification.insertMany(notifications);
  }

  /**
   * Send appointment reminder notification
   */
  static async appointmentReminder(
    userId: string,
    appointmentId: string,
    patientName: string,
    dateTime: string
  ): Promise<void> {
    await this.create({
      userId,
      type: "appointment_reminder",
      title: "Upcoming Appointment",
      message: `${patientName} has an appointment scheduled for ${dateTime}`,
      priority: "medium",
      actionUrl: `/appointments/${appointmentId}`,
      metadata: { appointmentId },
    });
  }

  /**
   * Send low stock alert
   */
  static async lowStockAlert(
    userId: string,
    medicineName: string,
    currentStock: number,
    medicineId: string
  ): Promise<void> {
    await this.create({
      userId,
      type: "low_stock",
      title: "Low Stock Alert",
      message: `${medicineName} is running low (${currentStock} remaining)`,
      priority: "high",
      actionUrl: `/pharmacy`,
      metadata: { medicineId, currentStock },
    });
  }

  /**
   * Send lab result ready notification
   */
  static async labResultReady(
    userId: string,
    labTestId: string,
    patientName: string
  ): Promise<void> {
    await this.create({
      userId,
      type: "lab_result_ready",
      title: "Lab Results Ready",
      message: `Lab results for ${patientName} are ready for review`,
      priority: "medium",
      actionUrl: `/lab/${labTestId}`,
      metadata: { labTestId },
    });
  }

  /**
   * Mark a notification as read
   */
  static async markAsRead(notificationId: string, userId: string): Promise<void> {
    await connectDB();
    await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true }
    );
  }

  /**
   * Mark all notifications as read for a user
   */
  static async markAllAsRead(userId: string): Promise<void> {
    await connectDB();
    await Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    await connectDB();
    return Notification.countDocuments({ user: userId, isRead: false });
  }

  /**
   * Delete old read notifications (cleanup)
   */
  static async cleanupOldNotifications(daysOld = 30): Promise<void> {
    await connectDB();
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    await Notification.deleteMany({ isRead: true, createdAt: { $lt: cutoff } });
  }
}
