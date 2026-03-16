ALTER TABLE `contractor_profiles` ADD `verificationStatus` enum('unverified','pending','verified','rejected') DEFAULT 'unverified' NOT NULL;--> statement-breakpoint
ALTER TABLE `contractor_profiles` ADD `idVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contractor_profiles` ADD `licenseVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contractor_profiles` ADD `insuranceVerified` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `contractor_profiles` ADD `idDocumentUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `contractor_profiles` ADD `licenseDocumentUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `contractor_profiles` ADD `insuranceDocumentUrl` varchar(512);--> statement-breakpoint
ALTER TABLE `contractor_profiles` ADD `verificationSubmittedAt` timestamp;--> statement-breakpoint
ALTER TABLE `contractor_profiles` ADD `verificationReviewedAt` timestamp;--> statement-breakpoint
ALTER TABLE `contractor_profiles` ADD `verificationNotes` text;