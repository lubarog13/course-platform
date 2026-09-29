import { NotificationType, NotificationEntityType, Notification } from "@prisma/client";
import { prisma } from "./prisma";

export async function createNotification(userId: number, type: NotificationType, title: string, body: string, entityType: NotificationEntityType, entityId: number): Promise<Notification | null> {
  try {
    const notification = await prisma.notification.create({
    data: {
      userId,
      type,
      title,
      body,
      entityType,
      entityId,
    },
  });
    return notification;
  } catch (error) {
    console.error(error);
    return null;
  }
}