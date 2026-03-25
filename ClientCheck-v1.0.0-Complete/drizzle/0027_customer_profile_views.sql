CREATE TABLE `customer_profile_views` (
  `id` int AUTO_INCREMENT NOT NULL,
  `customerId` int NOT NULL,
  `userId` int NOT NULL,
  `viewedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `customer_profile_views_id` PRIMARY KEY(`id`),
  CONSTRAINT `customer_profile_views_customerId_customers_id_fk` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE CASCADE,
  CONSTRAINT `customer_profile_views_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE INDEX `customer_profile_views_customerId_viewedAt_idx` ON `customer_profile_views` (`customerId`, `viewedAt`);
