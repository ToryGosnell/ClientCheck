import { useRef, useCallback } from "react";
import { ScrollView, View, Text, StyleSheet, type NativeSyntheticEvent, type NativeScrollEvent } from "react-native";
import { useColors } from "@/hooks/use-colors";

export const LEGAL_VERSION = "2026-03";

export type LegalDocType = "terms" | "privacy" | "dispute-policy" | "content-policy";

interface Props {
  docType: LegalDocType;
  onReachedBottom?: () => void;
}

export function LegalDocumentContent({ docType, onReachedBottom }: Props) {
  const colors = useColors();
  const reachedRef = useRef(false);

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (reachedRef.current) return;
      const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
      const distanceFromBottom = contentSize.height - layoutMeasurement.height - contentOffset.y;
      if (distanceFromBottom < 40) {
        reachedRef.current = true;
        onReachedBottom?.();
      }
    },
    [onReachedBottom],
  );

  const doc = DOCUMENTS[docType];

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.content}
      onScroll={handleScroll}
      scrollEventThrottle={200}
      showsVerticalScrollIndicator
    >
      <Text style={[s.title, { color: colors.foreground }]}>{doc.title}</Text>
      <Text style={[s.lastUpdated, { color: colors.muted }]}>Last Updated: March 15, 2026</Text>

      {doc.sections.map((sec, i) => (
        <View key={i} style={s.section}>
          {sec.heading ? (
            <Text style={[s.sectionTitle, { color: colors.foreground }]}>{sec.heading}</Text>
          ) : null}
          <Text style={[s.sectionBody, { color: colors.muted }]}>{sec.body}</Text>
        </View>
      ))}

      <View style={s.bottomPad} />
    </ScrollView>
  );
}

interface DocSection {
  heading?: string;
  body: string;
}

interface DocDef {
  title: string;
  sections: DocSection[];
}

const DOCUMENTS: Record<LegalDocType, DocDef> = {
  terms: {
    title: "ClientCheck Terms & Conditions",
    sections: [
      {
        body: 'Welcome to ClientCheck. These Terms & Conditions ("Terms") govern your access to and use of the ClientCheck platform, including our website, mobile applications, and all related services (collectively, the "Platform"). By creating an account or using the Platform, you agree to be bound by these Terms. If you do not agree, do not use the Platform.',
      },
      {
        heading: "1. Definitions",
        body: '"Platform" refers to the ClientCheck website, mobile applications, APIs, and all related services.\n\n"User" refers to any individual or entity that accesses or uses the Platform, including Contractors and Customers.\n\n"Contractor" refers to a licensed or unlicensed service professional who uses the Platform to review or research customer histories.\n\n"Customer" refers to an individual whose information, reviews, or ratings appear on the Platform.\n\n"Content" refers to all user-generated reviews, ratings, flags, comments, and other submissions made through the Platform.',
      },
      {
        heading: "2. Purpose of the Platform",
        body: "ClientCheck is designed to help contractors make informed decisions before accepting jobs by providing access to customer history, reviews, and risk assessments shared by other contractors.\n\nThe Platform also allows customers to view their profiles, respond to reviews, and submit disputes regarding content they believe is inaccurate.\n\nClientCheck does not independently verify user-generated content and makes no guarantees regarding its accuracy, completeness, or reliability.",
      },
      {
        heading: "3. Account Registration & Eligibility",
        body: "You must be at least 18 years of age to create an account. You agree to provide accurate, current, and complete information during registration and to keep your account information up to date.\n\nYou are solely responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must notify ClientCheck immediately of any unauthorized use of your account.\n\nClientCheck reserves the right to suspend or terminate accounts that contain inaccurate information or violate these Terms.",
      },
      {
        heading: "4. Contractor Verification",
        body: "Contractors may be required to provide a valid contractor license number for identity and eligibility verification. Verified contractors receive a verification badge and may qualify for promotional offers such as complimentary access periods.\n\nIf a contractor license cannot be verified through our verification process, ClientCheck may restrict access to certain features, remove associated content, or require paid access.\n\nVerification status may be reviewed periodically and may be revoked if the underlying license expires, is suspended, or is found to be invalid.",
      },
      {
        heading: "5. User Content & Conduct",
        body: "By submitting content to the Platform, you represent and warrant that:\n\n• The content is based on genuine, firsthand experiences.\n• The content is truthful and not intentionally misleading.\n• The content does not contain threats, harassment, hate speech, or personally identifiable information beyond what is necessary.\n• You have the legal right to submit the content.\n\nClientCheck reserves the right to review, edit, or remove any content that violates these Terms, our Content Policy, or applicable law. Repeated violations may result in account suspension or termination.\n\nYou retain ownership of content you submit but grant ClientCheck a non-exclusive, worldwide, royalty-free license to use, display, reproduce, and distribute your content in connection with operating the Platform.",
      },
      {
        heading: "6. Disputes & Review Integrity",
        body: "Customers and other affected parties may submit disputes regarding content they believe is inaccurate, misleading, or defamatory. Dispute submission may require an active paid membership.\n\nClientCheck will review disputes internally and may take actions including but not limited to: requesting additional information from the original reviewer, adding context to the review, modifying the content, or removing the content entirely.\n\nDisputes may trigger contractor verification checks. If the original reviewer's identity or credentials cannot be verified, the associated content may be removed.\n\nClientCheck's dispute decisions are final and not subject to appeal, except in cases involving new evidence not previously considered.",
      },
      {
        heading: "7. Membership & Payments",
        body: "Certain features of the Platform require a paid membership or subscription. Current pricing includes:\n\n• Contractor Access: $100.00 per year (or free for 12 months with a verified contractor license)\n• Customer Membership: $9.99 per month\n\nAll payments are processed securely through Stripe, our third-party payment processor. ClientCheck does not store complete credit card numbers or sensitive payment information.\n\nSubscriptions automatically renew at the end of each billing period unless cancelled before the renewal date. You may cancel your subscription at any time through your account settings.\n\nRefunds are handled on a case-by-case basis. ClientCheck is not obligated to provide refunds for partial billing periods.",
      },
      {
        heading: "8. Platform Integrity & Moderation",
        body: "ClientCheck may review, restrict, or remove accounts or content at any time to maintain the integrity, safety, and trustworthiness of the Platform. This includes but is not limited to:\n\n• Removing fake, fraudulent, or bot-generated reviews\n• Restricting accounts engaged in review manipulation\n• Removing content flagged by multiple independent users\n• Blocking IP addresses or devices associated with abuse\n\nClientCheck uses a combination of automated systems and human review to identify and address violations.",
      },
      {
        heading: "9. Intellectual Property",
        body: "The ClientCheck name, logo, design, and all proprietary technology are owned by ClientCheck and protected by applicable intellectual property laws. You may not copy, modify, distribute, or create derivative works based on any part of the Platform without prior written consent.\n\nAll trademarks, service marks, and trade names used on the Platform are the property of their respective owners.",
      },
      {
        heading: "10. Disclaimers",
        body: 'The Platform is provided on an "AS IS" and "AS AVAILABLE" basis without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.\n\nClientCheck does not guarantee:\n\n• The accuracy, reliability, or completeness of any user-generated content\n• That the Platform will be uninterrupted, secure, or error-free\n• That any particular outcome will result from use of the Platform\n• That contractor verifications are current or comprehensive',
      },
      {
        heading: "11. Limitation of Liability",
        body: "To the maximum extent permitted by applicable law, ClientCheck, its officers, directors, employees, and agents shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from:\n\n• Your use of or inability to use the Platform\n• Any user-generated content or conduct of third parties on the Platform\n• Unauthorized access to or alteration of your data\n• Any decisions made based on information obtained through the Platform\n\nIn no event shall ClientCheck's total liability exceed the amount you paid to ClientCheck in the twelve (12) months preceding the event giving rise to the claim.",
      },
      {
        heading: "12. Indemnification",
        body: "You agree to indemnify, defend, and hold harmless ClientCheck and its affiliates, officers, directors, employees, and agents from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising out of or related to your use of the Platform, your violation of these Terms, or your violation of any rights of a third party.",
      },
      {
        heading: "13. Termination",
        body: "ClientCheck may suspend or terminate your account and access to the Platform at any time, with or without cause, and with or without notice. Grounds for termination include but are not limited to:\n\n• Violation of these Terms or any referenced policies\n• Submission of false, fraudulent, or unverifiable information\n• Engagement in conduct that harms other users or the Platform\n• Failure to maintain valid payment information for paid subscriptions\n\nUpon termination, your right to use the Platform ceases immediately. Content you have submitted may remain on the Platform unless removal is required by law or our policies.",
      },
      {
        heading: "14. Governing Law & Dispute Resolution",
        body: "These Terms shall be governed by and construed in accordance with the laws of the State of Arizona, without regard to its conflict of law provisions.\n\nAny dispute arising out of or relating to these Terms or the Platform shall first be attempted to be resolved through good-faith negotiation. If negotiation fails, the dispute shall be resolved through binding arbitration in accordance with the rules of the American Arbitration Association.",
      },
      {
        heading: "15. Changes to These Terms",
        body: "ClientCheck reserves the right to modify these Terms at any time. Material changes will be communicated through the Platform or via email. Your continued use of the Platform after changes are posted constitutes acceptance of the revised Terms.\n\nWe encourage you to review these Terms periodically.",
      },
      {
        heading: "16. Contact Information",
        body: "If you have questions about these Terms, please contact us:\n\nEmail: support@clientcheck.app\nWebsite: https://clientcheck.app",
      },
    ],
  },

  privacy: {
    title: "ClientCheck Privacy Policy",
    sections: [
      {
        body: "This Privacy Policy describes how ClientCheck (\"we,\" \"us,\" or \"our\") collects, uses, shares, and protects your personal information when you use our platform, website, and mobile applications (collectively, the \"Platform\"). By using the Platform, you consent to the practices described in this policy.",
      },
      {
        heading: "1. Information We Collect",
        body: "We collect information in the following categories:\n\nAccount Information: Name, email address, phone number, account type (contractor or customer), and profile information you provide during registration.\n\nContractor Verification Data: Contractor license number, licensing state, and verification status when provided for identity verification purposes.\n\nPayment Information: Billing details processed through Stripe. We do not store complete credit card numbers on our servers. We retain Stripe customer IDs, subscription IDs, and transaction references.\n\nUser-Generated Content: Reviews, ratings, flags, comments, dispute submissions, and any other content you create on the Platform.\n\nUsage Data: Device information, IP address, browser type, operating system, pages viewed, features used, search queries, timestamps, and interaction patterns.\n\nCommunication Data: Messages sent through the Platform, support requests, and feedback submissions.",
      },
      {
        heading: "2. How We Use Your Information",
        body: "We use collected information for the following purposes:\n\n• Operating, maintaining, and improving the Platform\n• Verifying contractor identities and license information\n• Processing payments and managing subscriptions\n• Calculating and displaying customer risk scores and ratings\n• Facilitating the dispute and review process\n• Sending service-related notifications (account updates, billing reminders, dispute status)\n• Detecting, preventing, and addressing fraud, abuse, and security issues\n• Analyzing usage patterns to improve user experience\n• Complying with legal obligations and enforcing our Terms",
      },
      {
        heading: "3. Payment Data",
        body: "All payment processing is handled by Stripe, Inc. When you provide payment information, it is transmitted directly to Stripe using industry-standard encryption. ClientCheck does not receive or store your complete credit card number, CVV, or other sensitive payment credentials.\n\nWe retain the following payment references for account management:\n• Stripe Customer ID\n• Subscription ID and status\n• Payment method type (e.g., Visa ending in 1234)\n• Invoice and transaction IDs\n\nFor more information about Stripe's privacy practices, please visit: https://stripe.com/privacy",
      },
      {
        heading: "4. Data Sharing & Disclosure",
        body: "We do not sell, rent, or trade your personal information to third parties for marketing purposes.\n\nWe may share your information in the following circumstances:\n\nService Providers: We share data with trusted third-party service providers (e.g., Stripe for payments, hosting providers, analytics tools) who assist in operating the Platform. These providers are contractually obligated to protect your data.\n\nLegal Requirements: We may disclose information if required by law, court order, subpoena, or government request, or if we believe disclosure is necessary to protect rights, safety, or property.\n\nPlatform Integrity: We may share information internally to investigate violations, prevent fraud, or enforce our Terms.\n\nBusiness Transfers: In the event of a merger, acquisition, or sale of assets, user data may be transferred as part of the transaction.",
      },
      {
        heading: "5. Public vs. Private Information",
        body: "The following information is publicly visible on the Platform:\n• First name and last initial\n• City and state\n• Reviews, ratings, and flags associated with your profile\n• Risk score and rating aggregates\n• Contractor verification status (verified badge)\n\nThe following information is private and not publicly displayed:\n• Full last name (displayed as initial only)\n• Phone number\n• Email address\n• Payment and billing information\n• IP address and device information\n• Contractor license number (verification status is shown, but not the number itself)",
      },
      {
        heading: "6. Data Retention",
        body: "We retain your personal information for as long as your account is active or as needed to provide services. Specific retention periods:\n\n• Account data: Retained until account deletion is requested\n• Reviews and ratings: Retained indefinitely as part of the community knowledge base, unless removed through the dispute process or policy enforcement\n• Payment records: Retained for 7 years for tax and legal compliance\n• Usage logs: Retained for up to 24 months for analytics and security purposes\n• Dispute records: Retained for 3 years after resolution\n\nUpon account deletion, we will remove or anonymize your personal information within 30 days, except where retention is required by law.",
      },
      {
        heading: "7. Data Security",
        body: "We implement reasonable technical and organizational safeguards to protect your personal information, including:\n\n• Encryption of data in transit using TLS/SSL\n• Secure password hashing\n• Access controls and authentication requirements for internal systems\n• Regular security reviews\n\nHowever, no method of transmission over the Internet or electronic storage is 100% secure. We cannot guarantee absolute security of your data and are not responsible for unauthorized access resulting from factors beyond our reasonable control.",
      },
      {
        heading: "8. Your Rights & Choices",
        body: "Depending on your jurisdiction, you may have the following rights regarding your personal data:\n\nAccess: You may request a copy of the personal information we hold about you.\n\nCorrection: You may update or correct inaccurate information through your account settings or by contacting us.\n\nDeletion: You may request deletion of your account and associated personal data, subject to our data retention requirements.\n\nData Portability: You may request your data in a structured, machine-readable format.\n\nOpt-Out: You may opt out of non-essential communications through your account settings.\n\nTo exercise any of these rights, please contact us at support@clientcheck.app. We will respond to requests within 30 days.",
      },
      {
        heading: "9. Cookies & Tracking Technologies",
        body: "We use cookies and similar technologies to:\n\n• Maintain your session and authentication state\n• Remember your preferences\n• Analyze usage patterns and improve the Platform\n• Detect and prevent fraud\n\nYou may control cookies through your browser settings, but disabling cookies may affect Platform functionality.",
      },
      {
        heading: "10. Children's Privacy",
        body: "The Platform is not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected data from a minor, we will delete it promptly.",
      },
      {
        heading: "11. International Data Transfers",
        body: "Your information may be transferred to and processed in countries other than your country of residence. These countries may have different data protection laws. By using the Platform, you consent to the transfer of your information to the United States and other jurisdictions where we operate.",
      },
      {
        heading: "12. Changes to This Policy",
        body: "We may update this Privacy Policy from time to time. Material changes will be communicated through the Platform or via email. The \"Last Updated\" date at the top of this policy indicates when the most recent changes were made.\n\nYour continued use of the Platform after changes are posted constitutes acceptance of the revised policy.",
      },
      {
        heading: "13. Contact Information",
        body: "If you have questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:\n\nEmail: support@clientcheck.app\nWebsite: https://clientcheck.app",
      },
    ],
  },

  "dispute-policy": {
    title: "ClientCheck Dispute Policy",
    sections: [
      {
        body: "This Dispute Policy outlines the process for submitting and resolving disputes regarding content on the ClientCheck platform.",
      },
      {
        heading: "1. Eligibility",
        body: "Only registered account holders may submit disputes. Customer membership ($9.99/month) may be required to submit dispute requests.\n\nDisputes must be submitted within 90 days of the content's original publication date.",
      },
      {
        heading: "2. Valid Reasons for Dispute",
        body: "Disputes may be submitted for the following reasons:\n\n• Factually incorrect information\n• Misleading or out-of-context content\n• Content based on mistaken identity (wrong person)\n• Defamatory or harassing content\n• Content that violates the Content Policy\n• Reviews from unverified or fraudulent accounts",
      },
      {
        heading: "3. Submission Process",
        body: "To submit a dispute:\n\n1. Navigate to the review or content in question\n2. Select \"Dispute This Review\"\n3. Provide a clear explanation of why the content is inaccurate\n4. Submit any supporting evidence (if applicable)\n\nYou will receive a confirmation and a reference number for tracking.",
      },
      {
        heading: "4. Review Process",
        body: "ClientCheck reviews disputes internally. Our review process includes:\n\n• Evaluating the disputed content against our Content Policy\n• Contacting the original reviewer for additional context when appropriate\n• Verifying contractor credentials if relevant\n• Reviewing any submitted evidence\n\nThe review process typically takes 5-10 business days.",
      },
      {
        heading: "5. Verification Checks",
        body: "Disputes may trigger contractor verification checks on the original reviewer. If the reviewer's contractor license or identity cannot be verified, the associated content may be flagged, restricted, or removed.",
      },
      {
        heading: "6. Possible Outcomes",
        body: "After review, the following outcomes are possible:\n\n• Content remains unchanged (dispute not substantiated)\n• Content is modified or annotated with additional context\n• Content is removed from the Platform\n• The original reviewer's account is flagged for further review\n\nYou will be notified of the outcome via your account.",
      },
      {
        heading: "7. Abuse of Dispute System",
        body: "Submitting false, frivolous, or excessive disputes may result in:\n\n• Rejection of current and future dispute requests\n• Temporary or permanent account restrictions\n• Forfeiture of membership fees",
      },
      {
        heading: "8. Final Decision",
        body: "ClientCheck has final authority on all dispute outcomes. Decisions are not subject to appeal except in cases where material new evidence is presented that was not available during the original review.",
      },
    ],
  },

  "content-policy": {
    title: "ClientCheck Content Policy",
    sections: [
      {
        body: "This Content Policy establishes guidelines for all user-generated content on the ClientCheck platform. All users are expected to follow these guidelines when submitting reviews, ratings, flags, and other content.",
      },
      {
        heading: "1. Allowed Content",
        body: "The following types of content are welcome on the Platform:\n\n• Honest, firsthand accounts of job-related experiences with customers\n• Factual descriptions of payment behavior, communication quality, and working conditions\n• Objective observations about customer conduct during service engagements\n• Constructive feedback that helps the contractor community make informed decisions",
      },
      {
        heading: "2. Prohibited Content",
        body: "The following types of content are strictly prohibited:\n\n• False or fabricated information\n• Content based on secondhand accounts or rumors\n• Threats, intimidation, or harassment\n• Hate speech, discriminatory language, or slurs\n• Impersonation of another individual or entity\n• Personally identifiable information (Social Security numbers, financial account numbers, etc.)\n• Content submitted as retaliation for a dispute or negative interaction unrelated to work\n• Spam, promotional material, or off-topic content\n• Content created by automated systems or bots",
      },
      {
        heading: "3. Content Verification",
        body: "ClientCheck may verify content through various means, including:\n\n• Cross-referencing with other reviews and platform data\n• Requesting supporting documentation from the reviewer\n• Contractor license and identity verification\n\nContent that cannot be verified or substantiated may be flagged, restricted, or removed at ClientCheck's discretion.",
      },
      {
        heading: "4. Contractor Verification & Content",
        body: "Reviews and content submitted by unverified contractors may be subject to additional scrutiny. If a contractor's identity or credentials cannot be verified:\n\n• Existing content may be flagged with an \"unverified\" label\n• Content may be restricted from appearing in search results or risk calculations\n• Content may be removed entirely",
      },
      {
        heading: "5. Red Flags & Green Flags",
        body: "Red flags and green flags are user-generated indicators based on individual contractor experiences. They are aggregated to provide a general risk profile but are not independently verified by ClientCheck.\n\nUsers should consider flags as one data point among many and should not rely solely on flags when making decisions.",
      },
      {
        heading: "6. Enforcement",
        body: "ClientCheck reserves the right to remove any content that violates this policy or threatens the integrity, safety, or trustworthiness of the Platform.\n\nEnforcement actions may include:\n\n• Content removal or modification\n• Account warnings\n• Temporary suspension\n• Permanent account termination\n\nRepeated or severe violations will result in escalating enforcement actions.",
      },
    ],
  },
};

const s = StyleSheet.create({
  scroll: { flex: 1 },
  content: { padding: 24, paddingBottom: 80 },
  title: { fontSize: 26, fontWeight: "900", marginBottom: 6, letterSpacing: -0.3 },
  lastUpdated: { fontSize: 13, marginBottom: 28 },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 17, fontWeight: "800", marginBottom: 10, letterSpacing: -0.2 },
  sectionBody: { fontSize: 15, lineHeight: 24 },
  bottomPad: { height: 40 },
});
