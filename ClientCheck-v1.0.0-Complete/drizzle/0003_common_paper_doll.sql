CREATE TABLE `review_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`reviewId` int NOT NULL,
	`photoUrl` text NOT NULL,
	`caption` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `review_photos_id` PRIMARY KEY(`id`)
);
