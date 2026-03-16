CREATE TABLE `payment_protection_quotes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contractorUserId` int NOT NULL,
  `customerId` int,
  `jobAmountCents` int NOT NULL,
  `premiumCents` int NOT NULL,
  `coverageCents` int NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `payment_protection_quotes_id` PRIMARY KEY(`id`)
);

CREATE TABLE `payment_protection_claims` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contractorUserId` int NOT NULL,
  `customerId` int,
  `customerName` varchar(255),
  `amountCents` int NOT NULL,
  `reason` enum('non_payment','chargeback','fraud','cancellation') NOT NULL,
  `status` enum('submitted','under_review','approved','denied') NOT NULL DEFAULT 'submitted',
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `payment_protection_claims_id` PRIMARY KEY(`id`)
);

CREATE TABLE `software_integration_connections` (
  `id` int NOT NULL AUTO_INCREMENT,
  `contractorUserId` int NOT NULL,
  `provider` enum('ServiceTitan','Housecall Pro','Jobber','Zapier','Custom API') NOT NULL,
  `status` enum('connected','pending','disconnected') NOT NULL DEFAULT 'pending',
  `externalAccountName` varchar(255),
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `software_integration_connections_id` PRIMARY KEY(`id`)
);

CREATE TABLE `trust_network_badges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `badge` enum('verified_identity','verified_license','insured','background_checked','top_responder') NOT NULL,
  `awardedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `trust_network_badges_id` PRIMARY KEY(`id`)
);

CREATE TABLE `industry_intelligence_snapshots` (
  `id` int NOT NULL AUTO_INCREMENT,
  `city` varchar(128) NOT NULL,
  `trade` varchar(128) NOT NULL,
  `metric` varchar(255) NOT NULL,
  `value` varchar(255) NOT NULL,
  `periodLabel` varchar(128) NOT NULL,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `industry_intelligence_snapshots_id` PRIMARY KEY(`id`)
);
