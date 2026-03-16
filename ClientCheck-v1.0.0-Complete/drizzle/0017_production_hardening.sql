CREATE TABLE IF NOT EXISTS `email_verification_tokens` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `email` varchar(320) NOT NULL,
  `tokenHash` varchar(255) NOT NULL UNIQUE,
  `status` enum('pending','verified','expired','revoked') NOT NULL DEFAULT 'pending',
  `expiresAt` timestamp NOT NULL,
  `verifiedAt` timestamp NULL,
  `lastSentAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `sendAttempts` int NOT NULL DEFAULT 1,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `actorUserId` int NULL,
  `actorRole` varchar(64) NULL,
  `action` varchar(128) NOT NULL,
  `entityType` varchar(128) NOT NULL,
  `entityId` varchar(128) NULL,
  `outcome` enum('success','failure','denied') NOT NULL DEFAULT 'success',
  `metadataJson` text NULL,
  `ipAddress` varchar(64) NULL,
  `userAgent` varchar(255) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `review_policy_acceptances` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `policyVersion` varchar(32) NOT NULL,
  `acceptedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ipAddress` varchar(64) NULL,
  `userAgent` varchar(255) NULL
);

CREATE TABLE IF NOT EXISTS `dispute_escalations` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `disputeId` int NOT NULL,
  `escalatedByUserId` int NOT NULL,
  `escalationType` enum('appeal','takedown_request','legal_review','sla_breach') NOT NULL,
  `status` enum('open','in_review','resolved','rejected') NOT NULL DEFAULT 'open',
  `notes` text NULL,
  `resolvedAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `notification_deliveries` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NULL,
  `channel` enum('push','email','sms','webhook') NOT NULL,
  `templateKey` varchar(128) NOT NULL,
  `destination` varchar(320) NULL,
  `status` enum('queued','sent','failed','retrying','delivered') NOT NULL DEFAULT 'queued',
  `providerMessageId` varchar(255) NULL,
  `payloadJson` text NULL,
  `errorMessage` text NULL,
  `attempts` int NOT NULL DEFAULT 0,
  `sentAt` timestamp NULL,
  `deliveredAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `integration_usage_events` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `partnerApiKeyId` int NULL,
  `provider` varchar(128) NULL,
  `eventType` varchar(128) NOT NULL,
  `requestId` varchar(128) NULL,
  `statusCode` int NULL,
  `mode` enum('sandbox','production') NOT NULL DEFAULT 'sandbox',
  `metadataJson` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `partner_api_key_scopes` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `partnerApiKeyId` int NOT NULL,
  `scope` varchar(128) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `partner_api_key_rotations` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `partnerApiKeyId` int NOT NULL,
  `rotatedByUserId` int NULL,
  `oldKeyHash` varchar(255) NOT NULL,
  `newKeyHash` varchar(255) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `customer_identity_profiles` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `customerId` int NOT NULL UNIQUE,
  `normalizedPhone` varchar(32) NULL,
  `normalizedEmail` varchar(320) NULL,
  `normalizedAddress` varchar(255) NULL,
  `normalizedName` varchar(255) NOT NULL,
  `confidenceScore` int NOT NULL DEFAULT 50,
  `duplicateClusterKey` varchar(255) NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `customer_identity_matches` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `sourceCustomerId` int NOT NULL,
  `targetCustomerId` int NOT NULL,
  `matchScore` int NOT NULL,
  `matchReasonsJson` text NULL,
  `status` enum('suggested','approved','rejected','merged') NOT NULL DEFAULT 'suggested',
  `reviewedByUserId` int NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `customer_merge_events` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `sourceCustomerId` int NOT NULL,
  `targetCustomerId` int NOT NULL,
  `mergedByUserId` int NOT NULL,
  `reason` text NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `reporter_trust_scores` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL UNIQUE,
  `trustScore` int NOT NULL DEFAULT 50,
  `confirmedReports` int NOT NULL DEFAULT 0,
  `dismissedReports` int NOT NULL DEFAULT 0,
  `falseReports` int NOT NULL DEFAULT 0,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS `rate_limit_events` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `actorKey` varchar(255) NOT NULL,
  `bucket` varchar(128) NOT NULL,
  `routeKey` varchar(255) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
