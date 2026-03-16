CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`status` enum('trial','active','cancelled','expired') NOT NULL DEFAULT 'trial',
	`trialStartedAt` timestamp NOT NULL DEFAULT (now()),
	`trialEndsAt` timestamp NOT NULL,
	`subscriptionStartedAt` timestamp,
	`subscriptionEndsAt` timestamp,
	`paymentMethod` varchar(64),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscriptions_userId_unique` UNIQUE(`userId`)
);
