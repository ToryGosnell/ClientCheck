ALTER TABLE `users` ADD COLUMN `referredByUserId` int NULL;
ALTER TABLE `users` ADD CONSTRAINT `users_referredByUserId_users_id_fk` FOREIGN KEY (`referredByUserId`) REFERENCES `users`(`id`) ON DELETE SET NULL;
