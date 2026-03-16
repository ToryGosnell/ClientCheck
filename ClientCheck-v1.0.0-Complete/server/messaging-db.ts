import { getDb } from "./db";
import { messages } from "@/drizzle/schema";
import { eq, and, or, desc } from "drizzle-orm";

/**
 * Send a message between two users
 */
export async function sendMessage(
  senderId: number,
  recipientId: number,
  text: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(messages).values({
    senderId,
    recipientId,
    text,
    read: false,
    createdAt: new Date(),
  });

  return result;
}

/**
 * Get conversation between two users
 */
export async function getConversation(userId1: number, userId2: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conversation = await db
    .select()
    .from(messages)
    .where(
      or(
        and(eq(messages.senderId, userId1), eq(messages.recipientId, userId2)),
        and(eq(messages.senderId, userId2), eq(messages.recipientId, userId1))
      )
    )
    .orderBy(desc(messages.createdAt));

  return conversation;
}

/**
 * Get all conversations for a user
 */
export async function getUserConversations(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get unique conversation partners
  const userMessages = await db
    .select()
    .from(messages)
    .where(
      or(eq(messages.senderId, userId), eq(messages.recipientId, userId))
    )
    .orderBy(desc(messages.createdAt));

  // Group by conversation partner
  const conversations: Record<number, typeof userMessages> = {};
  for (const msg of userMessages) {
    const partnerId = msg.senderId === userId ? msg.recipientId : msg.senderId;
    if (!conversations[partnerId]) {
      conversations[partnerId] = [];
    }
    conversations[partnerId].push(msg);
  }

  return Object.entries(conversations).map(([partnerId, msgs]) => ({
    partnerId: parseInt(partnerId, 10),
    lastMessage: msgs[0],
    unreadCount: msgs.filter((m) => m.recipientId === userId && !m.read).length,
  }));
}

/**
 * Mark messages as read
 */
export async function markMessagesAsRead(userId: number, senderId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(messages)
    .set({ read: true })
    .where(
      and(eq(messages.recipientId, userId), eq(messages.senderId, senderId))
    );
}

/**
 * Get unread message count for user
 */
export async function getUnreadMessageCount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select()
    .from(messages)
    .where(
      and(eq(messages.recipientId, userId), eq(messages.read, false))
    );

  return result.length;
}
