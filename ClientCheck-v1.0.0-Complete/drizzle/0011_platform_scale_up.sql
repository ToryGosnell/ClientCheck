CREATE TABLE `review_evidence` (
  `id` int AUTO_INCREMENT NOT NULL,
  `reviewId` int NOT NULL,
  `uploadedByUserId` int NOT NULL,
  `fileUrl` varchar(512) NOT NULL,
  `fileType` varchar(64) NOT NULL,
  `caption` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `review_evidence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `fraud_signals` (
  `id` int AUTO_INCREMENT NOT NULL,
  `reviewId` int,
  `userId` int NOT NULL,
  `signalType` varchar(64) NOT NULL,
  `severity` enum('low','medium','high','critical') NOT NULL DEFAULT 'medium',
  `score` int NOT NULL DEFAULT 0,
  `details` text,
  `ipAddress` varchar(64),
  `deviceFingerprint` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `fraud_signals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contractor_reviews` (
  `id` int AUTO_INCREMENT NOT NULL,
  `contractorUserId` int NOT NULL,
  `customerId` int NOT NULL,
  `professionalism` int NOT NULL,
  `communication` int NOT NULL,
  `reliability` int NOT NULL,
  `paymentFairness` int NOT NULL,
  `reviewText` text,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `contractor_reviews_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contractor_scores` (
  `id` int AUTO_INCREMENT NOT NULL,
  `contractorUserId` int NOT NULL,
  `overallScore` decimal(5,2) NOT NULL DEFAULT '0',
  `reviewCount` int NOT NULL DEFAULT 0,
  `lastCalculatedAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `contractor_scores_id` PRIMARY KEY(`id`),
  CONSTRAINT `contractor_scores_contractorUserId_unique` UNIQUE(`contractorUserId`)
);
--> statement-breakpoint
CREATE TABLE `referral_campaigns` (
  `id` int AUTO_INCREMENT NOT NULL,
  `name` varchar(128) NOT NULL,
  `rewardType` varchar(64) NOT NULL,
  `rewardValue` varchar(64) NOT NULL,
  `startsAt` timestamp NOT NULL,
  `endsAt` timestamp,
  `isActive` boolean NOT NULL DEFAULT true,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `referral_campaigns_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `partner_api_keys` (
  `id` int AUTO_INCREMENT NOT NULL,
  `partnerName` varchar(128) NOT NULL,
  `apiKeyHash` varchar(255) NOT NULL,
  `isActive` boolean NOT NULL DEFAULT true,
  `lastUsedAt` timestamp,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `partner_api_keys_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhook_deliveries` (
  `id` int AUTO_INCREMENT NOT NULL,
  `eventType` varchar(128) NOT NULL,
  `targetUrl` varchar(512) NOT NULL,
  `payload` text NOT NULL,
  `responseCode` int,
  `status` enum('pending','success','failed') NOT NULL DEFAULT 'pending',
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `deliveredAt` timestamp,
  CONSTRAINT `webhook_deliveries_id` PRIMARY KEY(`id`)
);
