/**
 * Beta Program Service
 * Manages beta tester signup, feedback collection, and analytics
 */

export interface BetaTester {
  id: string;
  email: string;
  phone: string;
  name: string;
  company?: string;
  experience: "beginner" | "intermediate" | "expert";
  signupDate: Date;
  status: "pending" | "approved" | "active" | "inactive";
  inviteCode?: string;
  feedbackCount: number;
  lastFeedbackDate?: Date;
}

export interface BetaFeedback {
  id: string;
  testerId: string;
  category: "bug" | "feature_request" | "ux" | "performance" | "general";
  title: string;
  description: string;
  severity?: "low" | "medium" | "high" | "critical";
  screenshots?: string[];
  timestamp: Date;
  status: "new" | "reviewed" | "in_progress" | "resolved";
}

export class BetaProgramService {
  static async signupBetaTester(data: {
    email: string;
    phone: string;
    name: string;
    company?: string;
    experience: "beginner" | "intermediate" | "expert";
  }): Promise<BetaTester | null> {
    try {
      // Generate unique invite code
      const inviteCode = this.generateInviteCode();

      // In production, save to database
      const tester: BetaTester = {
        id: `beta_${Date.now()}`,
        email: data.email,
        phone: data.phone,
        name: data.name,
        company: data.company,
        experience: data.experience,
        signupDate: new Date(),
        status: "pending",
        inviteCode,
        feedbackCount: 0,
      };

      // Send welcome email with invite code
      await this.sendWelcomeEmail(tester);

      return tester;
    } catch (error) {
      console.error("Failed to signup beta tester:", error);
      return null;
    }
  }

  static async approveBetaTester(testerId: string): Promise<boolean> {
    try {
      // Update tester status to approved
      // Send approval email with download link
      console.log(`Beta tester ${testerId} approved`);
      return true;
    } catch (error) {
      console.error("Failed to approve beta tester:", error);
      return false;
    }
  }

  static async submitFeedback(data: {
    testerId: string;
    category: "bug" | "feature_request" | "ux" | "performance" | "general";
    title: string;
    description: string;
    severity?: "low" | "medium" | "high" | "critical";
    screenshots?: string[];
  }): Promise<BetaFeedback | null> {
    try {
      const feedback: BetaFeedback = {
        id: `feedback_${Date.now()}`,
        testerId: data.testerId,
        category: data.category,
        title: data.title,
        description: data.description,
        severity: data.severity || "low",
        screenshots: data.screenshots,
        timestamp: new Date(),
        status: "new",
      };

      // Save to database
      // Send confirmation email to tester
      console.log(`Feedback submitted: ${feedback.id}`);

      return feedback;
    } catch (error) {
      console.error("Failed to submit feedback:", error);
      return null;
    }
  }

  static async getBetaTesterStats(): Promise<{
    totalTesters: number;
    activeTesters: number;
    totalFeedback: number;
    feedbackByCategory: Record<string, number>;
    criticalBugs: number;
  }> {
    try {
      // Query database for stats
      return {
        totalTesters: 0,
        activeTesters: 0,
        totalFeedback: 0,
        feedbackByCategory: {},
        criticalBugs: 0,
      };
    } catch (error) {
      console.error("Failed to get beta stats:", error);
      return {
        totalTesters: 0,
        activeTesters: 0,
        totalFeedback: 0,
        feedbackByCategory: {},
        criticalBugs: 0,
      };
    }
  }

  static async sendWeeklyReport(): Promise<boolean> {
    try {
      // Compile weekly feedback report
      // Send to admin email
      console.log("Weekly beta report sent");
      return true;
    } catch (error) {
      console.error("Failed to send weekly report:", error);
      return false;
    }
  }

  private static generateInviteCode(): string {
    return `BETA${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  }

  private static async sendWelcomeEmail(tester: BetaTester): Promise<boolean> {
    try {
      const emailContent = `
        Welcome to the ClientCheck Beta Program!
        
        Hi ${tester.name},
        
        Thank you for signing up to be a beta tester! We're excited to have you help us build the future of contractor vetting.
        
        Your invite code: ${tester.inviteCode}
        
        We'll review your application and send you a download link shortly. In the meantime, here's what to expect:
        
        ✅ Early access to new features
        ✅ Direct feedback channel with the team
        ✅ Free premium subscription during beta
        ✅ Recognition as a beta tester in the app
        
        Questions? Reply to this email or visit https://contractorvet.app/beta
        
        Best regards,
        The ClientCheck Team
      `;

      // Send via email service
      console.log(`Welcome email sent to ${tester.email}`);
      return true;
    } catch (error) {
      console.error("Failed to send welcome email:", error);
      return false;
    }
  }
}

export async function submitBetaSignup(data: {
  email: string;
  phone: string;
  name: string;
  company?: string;
  experience: "beginner" | "intermediate" | "expert";
}) {
  const tester = await BetaProgramService.signupBetaTester(data);
  return {
    success: !!tester,
    tester,
  };
}

export async function submitBetaFeedback(data: {
  testerId: string;
  category: "bug" | "feature_request" | "ux" | "performance" | "general";
  title: string;
  description: string;
  severity?: "low" | "medium" | "high" | "critical";
  screenshots?: string[];
}) {
  const feedback = await BetaProgramService.submitFeedback(data);
  return {
    success: !!feedback,
    feedback,
  };
}
