ALTER TABLE `reviews` ADD `ratingPaymentReliability` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reviews` ADD `ratingLawsuitHistory` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reviews` ADD `ratingPermitPulling` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reviews` ADD `ratingChargebackHistory` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reviews` ADD `clientScore` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `reviews` ADD `confirmationCount` int DEFAULT 0 NOT NULL;