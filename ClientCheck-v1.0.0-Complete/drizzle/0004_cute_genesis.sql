CREATE TABLE `review_disputes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewId` int NOT NULL,
	`customerId` int NOT NULL,
	`status` enum('open','responded','resolved','dismissed') NOT NULL DEFAULT 'open',
	`customerResponse` text,
	`respondedAt` timestamp,
	`resolvedAt` timestamp,
	`resolution` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `review_disputes_id` PRIMARY KEY(`id`)
);
