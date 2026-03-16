CREATE TABLE `contractor_analytics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`contractorUserId` int NOT NULL,
	`totalReviewsSubmitted` int NOT NULL DEFAULT 0,
	`totalDisputesReceived` int NOT NULL DEFAULT 0,
	`totalDisputesResponded` int NOT NULL DEFAULT 0,
	`disputeResponseRate` decimal(5,2) NOT NULL DEFAULT '0',
	`averageReputationScore` decimal(3,1) NOT NULL DEFAULT '0',
	`mostCommonRedFlag` varchar(128),
	`redFlagCounts` text,
	`reviewsThisMonth` int NOT NULL DEFAULT 0,
	`reviewsLastMonth` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `contractor_analytics_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`type` enum('trial_expiring_7_days','trial_expiring_1_day','trial_expired','dispute_filed','review_posted','review_approved','review_rejected') NOT NULL,
	`recipientEmail` varchar(320) NOT NULL,
	`status` enum('pending','sent','failed') NOT NULL DEFAULT 'pending',
	`sentAt` timestamp,
	`failureReason` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `review_moderations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewId` int NOT NULL,
	`status` enum('pending','approved','rejected','request_changes') NOT NULL DEFAULT 'pending',
	`reason` text,
	`moderatorId` int,
	`moderatedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `review_moderations_id` PRIMARY KEY(`id`)
);
