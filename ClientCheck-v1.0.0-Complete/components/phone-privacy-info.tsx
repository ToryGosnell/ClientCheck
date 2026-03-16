import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useState } from "react";

interface PrivacyFieldProps {
  field?: "phone" | "address" | "email";
}

export function PhonePrivacyInfo({ field = "phone" }: PrivacyFieldProps = {}) {
  const colors = useColors();
  const [showDetails, setShowDetails] = useState(false);

  const fieldConfig = {
    phone: {
      title: "Phone is Private",
      description: "Used only for matching & verification",
      detailsTitle: "Why We Keep Phone Numbers Private",
      details: [
        {
          label: "Identity Verification",
          desc: "We use phone numbers to confirm who the customer is",
        },
        {
          label: "Duplicate Detection",
          desc: "Phone numbers help us find existing customer profiles",
        },
        {
          label: "Never Shared Publicly",
          desc: "Phone numbers are only visible to you and admins",
        },
        {
          label: "Internal Use Only",
          desc: "Used only for matching and verification, never for marketing",
        },
      ],
    },
    address: {
      title: "Address is Private",
      description: "Used only for matching & verification",
      detailsTitle: "Why We Keep Addresses Private",
      details: [
        {
          label: "Location Matching",
          desc: "Addresses help us match customers across different contractors",
        },
        {
          label: "Service Area Verification",
          desc: "Confirms the customer is in your service area",
        },
        {
          label: "Never Shared Publicly",
          desc: "Addresses are only visible to you and admins",
        },
        {
          label: "Safety & Privacy",
          desc: "We protect customer location data for their safety",
        },
      ],
    },
    email: {
      title: "Email is Private",
      description: "Used only for verification & communication",
      detailsTitle: "Why We Keep Emails Private",
      details: [
        {
          label: "Account Verification",
          desc: "Email confirms the customer's identity and contact method",
        },
        {
          label: "Duplicate Prevention",
          desc: "Helps us identify if a customer already has a profile",
        },
        {
          label: "Never Shared Publicly",
          desc: "Emails are only visible to you and admins",
        },
        {
          label: "No Marketing",
          desc: "We never use customer emails for marketing or spam",
        },
      ],
    },
  };

  const config = fieldConfig[field];

  return (
    <View style={styles.container}>
      {/* Compact Info */}
      <TouchableOpacity
        onPress={() => setShowDetails(!showDetails)}
        style={[
          styles.infoBox,
          {
            backgroundColor: colors.primary + "10",
            borderColor: colors.primary,
          },
        ]}
      >
        <Text style={styles.infoIcon}>🔒</Text>
        <View style={{ flex: 1 }}>
          <Text style={[styles.infoTitle, { color: colors.primary }]}>
            {config.title}
          </Text>
          <Text style={[styles.infoText, { color: colors.muted }]}>
            {config.description}
          </Text>
        </View>
        <Text style={[styles.expandIcon, { color: colors.primary }]}>
          {showDetails ? "−" : "+"}
        </Text>
      </TouchableOpacity>

      {/* Expanded Details */}
      {showDetails && (
        <View
          style={[
            styles.detailsBox,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.detailsTitle, { color: colors.foreground }]}>
            {config.detailsTitle}
          </Text>

          {config.details.map((detail, idx) => (
            <View key={idx} style={styles.detailItem}>
              <Text style={[styles.detailBullet, { color: colors.primary }]}>
                ✓
              </Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailLabel, { color: colors.foreground }]}>
                  {detail.label}
                </Text>
                <Text style={[styles.detailDesc, { color: colors.muted }]}>
                  {detail.desc}
                </Text>
              </View>
            </View>
          ))}

          <View
            style={[
              styles.privacyNotice,
              {
                backgroundColor: colors.success + "10",
                borderColor: colors.success,
              },
            ]}
          >
            <Text style={[styles.noticeText, { color: colors.success }]}>
              Your data is secure and private. We never sell or share customer
              information.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  infoBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  infoText: {
    fontSize: 12,
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 18,
    fontWeight: "700",
  },
  detailsBox: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 16,
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  detailItem: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  detailBullet: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  detailDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  privacyNotice: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginTop: 4,
  },
  noticeText: {
    fontSize: 12,
    fontWeight: "500",
    lineHeight: 16,
  },
});
