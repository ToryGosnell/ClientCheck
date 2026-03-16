CREATE TABLE `contractor_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`trade` varchar(128),
	`licenseNumber` varchar(64),
	`company` varchar(255),
	`city` varchar(128),
	`state` varchar(64),
	`bio` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contractor_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`firstName` varchar(128) NOT NULL,
	`lastName` varchar(128) NOT NULL,
	`phone` varchar(32),
	`email` varchar(320),
	`address` varchar(255),
	`city` varchar(128),
	`state` varchar(64),
	`zip` varchar(16),
	`overallRating` decimal(3,2) DEFAULT '0.00',
	`reviewCount` int NOT NULL DEFAULT 0,
	`ratingPaidOnTime` decimal(3,2) DEFAULT '0.00',
	`ratingCommunication` decimal(3,2) DEFAULT '0.00',
	`ratingKnewWhatTheyWanted` decimal(3,2) DEFAULT '0.00',
	`ratingProfessionalism` decimal(3,2) DEFAULT '0.00',
	`ratingInvoiceAccuracy` decimal(3,2) DEFAULT '0.00',
	`ratingWouldWorkAgain` decimal(3,2) DEFAULT '0.00',
	`riskLevel` enum('low','medium','high','unknown') NOT NULL DEFAULT 'unknown',
	`createdByUserId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `customers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_helpful_votes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewId` int NOT NULL,
	`userId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `review_helpful_votes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`contractorUserId` int NOT NULL,
	`overallRating` int NOT NULL,
	`ratingPaidOnTime` int NOT NULL,
	`ratingCommunication` int NOT NULL,
	`ratingKnewWhatTheyWanted` int NOT NULL,
	`ratingProfessionalism` int NOT NULL,
	`ratingInvoiceAccuracy` int NOT NULL,
	`ratingWouldWorkAgain` int NOT NULL,
	`reviewText` text,
	`jobType` varchar(128),
	`jobDate` varchar(32),
	`jobAmount` varchar(32),
	`redFlags` text,
	`helpfulCount` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `reviews_id` PRIMARY KEY(`id`)
);
