import cron, { ScheduledTask } from "node-cron";
import { and, eq, gte, lte } from "drizzle-orm";
import { subscriptions, users } from "../drizzle/schema";
import { sendTrialExpiringEmail, sendTrialExpiredEmail } from "./email-service";
import { markReminderSent } from "./subscription-db";
import { getDb } from "./db";

/**
 * Trial Reminder Cron Job
 * Runs daily at 9:00 AM to check for trial expiration dates
 * and send reminder emails
 */

interface UserWithTrial {
  id: number;
  email: string;
  name: string;
  trialStartDate: Date;
  trialEndDate: Date;
}

/**
 * Get users whose trial is expiring soon or has expired
 */
async function getUsersNeedingReminders(): Promise<{
  expiringIn3Days: UserWithTrial[];
  expiredToday: UserWithTrial[];
}> {
  try {
    const db = await getDb();
    if (!db) {
      console.warn("Database not available for trial reminders");
      return { expiringIn3Days: [], expiredToday: [] };
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000 - 1);
    const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    const baseFields = {
      id: users.id,
      email: users.email,
      name: users.name,
      trialStartDate: subscriptions.trialStartedAt,
      trialEndDate: subscriptions.trialEndsAt,
    };
    type Row = { id: number; email: string | null; name: string | null; trialStartDate: Date; trialEndDate: Date };

    const expiringRows = (await db
      .select(baseFields)
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .where(
        and(
          eq(subscriptions.status, "trial"),
          gte(subscriptions.trialEndsAt, now),
          lte(subscriptions.trialEndsAt, in3Days)
        )
      )) as Row[];

    const expiredRows = (await db
      .select(baseFields)
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .where(
        and(
          eq(subscriptions.status, "trial"),
          gte(subscriptions.trialEndsAt, startOfToday),
          lte(subscriptions.trialEndsAt, endOfToday)
        )
      )) as Row[];

    const toUser = (row: { id: number; email: string | null; name: string | null; trialStartDate: Date; trialEndDate: Date }): UserWithTrial => ({
      id: row.id,
      email: row.email ?? "",
      name: row.name ?? "User",
      trialStartDate: row.trialStartDate instanceof Date ? row.trialStartDate : new Date(row.trialStartDate),
      trialEndDate: row.trialEndDate instanceof Date ? row.trialEndDate : new Date(row.trialEndDate),
    });

    return {
      expiringIn3Days: expiringRows.filter((r) => r.email).map(toUser),
      expiredToday: expiredRows.filter((r) => r.email).map(toUser),
    };
  } catch (error) {
    console.error("Error fetching users for trial reminders:", error);
    return { expiringIn3Days: [], expiredToday: [] };
  }
}

/**
 * Send trial expiring reminder
 */
async function sendTrialExpiringReminder(user: UserWithTrial): Promise<boolean> {
  try {
    const daysRemaining = Math.ceil(
      (user.trialEndDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)
    );

    const upgradeUrl = `https://clientcheck.app/subscription?userId=${user.id}`;

    const emailSent = await sendTrialExpiringEmail(
      user.email,
      user.name,
      daysRemaining,
      upgradeUrl
    );

    if (emailSent) {
      await markReminderSent(user.id);
      console.log(`✅ Trial reminder sent to ${user.email}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Failed to send trial reminder to ${user.email}:`, error);
    return false;
  }
}

/**
 * Send trial expired notification
 */
async function sendTrialExpiredNotification(user: UserWithTrial): Promise<boolean> {
  try {
    const upgradeUrl = `https://clientcheck.app/subscription?userId=${user.id}`;

    const emailSent = await sendTrialExpiredEmail(user.email, user.name, upgradeUrl);

    if (emailSent) {
      console.log(`✅ Trial expired email sent to ${user.email}`);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Failed to send trial expired email to ${user.email}:`, error);
    return false;
  }
}

/**
 * Main cron job function
 */
async function runTrialReminderCron(): Promise<void> {
  console.log("🔔 Running trial reminder cron job...");

  try {
    const { expiringIn3Days, expiredToday } = await getUsersNeedingReminders();

    // Send reminders for trials expiring in 3 days
    if (expiringIn3Days.length > 0) {
      console.log(`📧 Sending ${expiringIn3Days.length} trial expiring reminders...`);
      for (const user of expiringIn3Days) {
        await sendTrialExpiringReminder(user);
      }
    }

    // Send notifications for expired trials
    if (expiredToday.length > 0) {
      console.log(`📧 Sending ${expiredToday.length} trial expired notifications...`);
      for (const user of expiredToday) {
        await sendTrialExpiredNotification(user);
      }
    }

    if (expiringIn3Days.length === 0 && expiredToday.length === 0) {
      console.log("✓ No trial reminders needed today");
    }

    console.log("✅ Trial reminder cron job completed");
  } catch (error) {
    console.error("❌ Trial reminder cron job failed:", error);
  }
}

/**
 * Initialize cron job
 * Runs daily at 9:00 AM
 */
export function initializeTrialReminderCron(): ScheduledTask {
  console.log("🚀 Initializing trial reminder cron job (daily at 9:00 AM)...");

  // Cron expression: 0 9 * * * (every day at 9:00 AM UTC)
  const task = cron.schedule("0 9 * * *", async () => {
    await runTrialReminderCron();
  });

  // Run immediately on startup (optional)
  // Uncomment to run on server start:
  // runTrialReminderCron();

  return task;
}

/**
 * Stop cron job
 */
export function stopTrialReminderCron(task: ScheduledTask): void {
  task.stop();
  console.log("🛑 Trial reminder cron job stopped");
}

/**
 * Manual trigger for testing
 */
export async function triggerTrialReminderCronManual(): Promise<void> {
  console.log("🔔 Manually triggering trial reminder cron job...");
  await runTrialReminderCron();
}
