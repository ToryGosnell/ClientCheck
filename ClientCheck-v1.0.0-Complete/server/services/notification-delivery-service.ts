import { and, eq } from "drizzle-orm";
import { notificationDeliveries } from "../../drizzle/schema";
import { getDb } from "../db";

export async function queueNotification(input: {
  userId?: number;
  channel: "push" | "email" | "sms" | "webhook";
  templateKey: string;
  destination?: string;
  payload?: unknown;
}) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(notificationDeliveries).values({
    userId: input.userId ?? null,
    channel: input.channel,
    templateKey: input.templateKey,
    destination: input.destination ?? null,
    payloadJson: input.payload ? JSON.stringify(input.payload) : null,
    status: "queued",
  });
  return result[0].insertId as number;
}

export async function markNotificationSent(id: number, providerMessageId?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(notificationDeliveries).set({
    status: "sent",
    providerMessageId: providerMessageId ?? null,
    attempts: 1,
    sentAt: new Date(),
  }).where(eq(notificationDeliveries.id, id));
}

export async function markNotificationFailed(id: number, errorMessage: string) {
  const db = await getDb();
  if (!db) return;
  const row = await db.select().from(notificationDeliveries).where(eq(notificationDeliveries.id, id)).limit(1);
  const attempts = (row[0]?.attempts || 0) + 1;
  await db.update(notificationDeliveries).set({
    status: attempts >= 3 ? "failed" : "retrying",
    attempts,
    errorMessage,
  }).where(eq(notificationDeliveries.id, id));
}

export async function getNotificationStatus(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(notificationDeliveries).where(eq(notificationDeliveries.id, id)).limit(1);
  return rows[0] ?? null;
}


export async function listNotificationHistory(userId?: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  const rows = userId
    ? await db.select().from(notificationDeliveries).where(eq(notificationDeliveries.userId, userId)).limit(limit)
    : await db.select().from(notificationDeliveries).limit(limit);
  return rows.sort((a, b) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime());
}
