ALTER TABLE `customers` MODIFY COLUMN `phone` varchar(32) NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` MODIFY COLUMN `address` varchar(255) NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` MODIFY COLUMN `city` varchar(128) NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` MODIFY COLUMN `state` varchar(64) NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` MODIFY COLUMN `zip` varchar(16) NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD `mergedIntoId` int;--> statement-breakpoint
ALTER TABLE `customers` ADD `isDuplicate` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `customers` ADD CONSTRAINT `customers_phone_unique` UNIQUE(`phone`);