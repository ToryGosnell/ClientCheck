CREATE TABLE `dispute_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`disputeId` int NOT NULL,
	`photoUrl` varchar(512) NOT NULL,
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `dispute_photos_id` PRIMARY KEY(`id`)
);
