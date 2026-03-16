CREATE TABLE `contractor_reviews` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `contractorUserId` int NOT NULL,
  `customerId` int NOT NULL,
  `professionalismRating` int NOT NULL,
  `communicationRating` int NOT NULL,
  `reliabilityRating` int NOT NULL,
  `workmanshipRating` int NOT NULL,
  `reviewText` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE `contractor_scores` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `contractorUserId` int NOT NULL UNIQUE,
  `overallScore` int NOT NULL DEFAULT 0,
  `professionalismScore` int NOT NULL DEFAULT 0,
  `communicationScore` int NOT NULL DEFAULT 0,
  `reliabilityScore` int NOT NULL DEFAULT 0,
  `workmanshipScore` int NOT NULL DEFAULT 0,
  `reviewsAnalyzed` int NOT NULL DEFAULT 0,
  `updatedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `verification_documents` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `contractorUserId` int NOT NULL,
  `documentType` enum('license','insurance','identity','business_registration','tax_document') NOT NULL,
  `documentUrl` varchar(512) NOT NULL,
  `status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `reviewedByUserId` int,
  `reviewedAt` timestamp NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `review_evidence` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `reviewId` int NOT NULL,
  `uploadedByUserId` int NOT NULL,
  `fileUrl` varchar(512) NOT NULL,
  `fileType` varchar(64),
  `caption` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `fraud_signals` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `reviewId` int,
  `userId` int,
  `customerId` int,
  `signalType` enum('duplicate_ip','velocity_spike','duplicate_device','duplicate_text','reputation_attack') NOT NULL,
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `description` text,
  `status` enum('open','reviewing','dismissed','confirmed') NOT NULL DEFAULT 'open',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `device_fingerprints` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `fingerprintHash` varchar(255) NOT NULL,
  `lastSeenIp` varchar(64),
  `lastSeenAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `partner_api_keys` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `partnerName` varchar(255) NOT NULL,
  `apiKeyHash` varchar(255) NOT NULL UNIQUE,
  `contactEmail` varchar(320),
  `status` enum('active','disabled','revoked') NOT NULL DEFAULT 'active',
  `rateLimitPerHour` int NOT NULL DEFAULT 500,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `lastUsedAt` timestamp NULL
);

CREATE TABLE `webhook_deliveries` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `partnerApiKeyId` int NOT NULL,
  `eventType` varchar(128) NOT NULL,
  `requestBody` text,
  `responseStatus` int,
  `deliveredAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `growth_campaigns` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `name` varchar(255) NOT NULL,
  `channel` enum('referral','sms','email','paid_social','organic','supply_house') NOT NULL,
  `status` enum('draft','active','paused','completed') NOT NULL DEFAULT 'draft',
  `incentiveType` enum('free_month','credit','badge','contest') NOT NULL DEFAULT 'free_month',
  `budgetCents` int NOT NULL DEFAULT 0,
  `startsAt` timestamp NULL,
  `endsAt` timestamp NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `growth_events` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int,
  `campaignId` int,
  `eventType` enum('invite_sent','signup_completed','review_submitted','subscription_started','risk_check_completed') NOT NULL,
  `metadata` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `territory_alerts` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `territoryKey` varchar(128) NOT NULL,
  `alertType` enum('new_high_risk_customer','new_contractor_signup','competitor_activity') NOT NULL,
  `isEnabled` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE `customer_watchlists` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `userId` int NOT NULL,
  `customerId` int NOT NULL,
  `notes` text,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
);
