ALTER TABLE `users`
  ADD COLUMN `referralCount` int NOT NULL DEFAULT 0 AFTER `referredByUserId`,
  ADD COLUMN `verifiedReferralCount` int NOT NULL DEFAULT 0 AFTER `referralCount`,
  ADD COLUMN `freeMonthsEarned` int NOT NULL DEFAULT 0 AFTER `verifiedReferralCount`,
  ADD COLUMN `subscriptionExtendedUntil` timestamp NULL AFTER `freeMonthsEarned`,
  ADD COLUMN `referralRewardUnseen` boolean NOT NULL DEFAULT false AFTER `subscriptionExtendedUntil`;

CREATE TABLE `contractor_invite_referrals` (
  `id` int AUTO_INCREMENT NOT NULL,
  `referrerId` int NOT NULL,
  `referredUserId` int NOT NULL,
  `isVerified` boolean NOT NULL DEFAULT false,
  `createdAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT `contractor_invite_referrals_id` PRIMARY KEY(`id`),
  CONSTRAINT `contractor_invite_referrals_referrerId_users_id_fk` FOREIGN KEY (`referrerId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `contractor_invite_referrals_referredUserId_users_id_fk` FOREIGN KEY (`referredUserId`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  CONSTRAINT `contractor_invite_referrals_referredUserId_unique` UNIQUE (`referredUserId`)
);

CREATE INDEX `contractor_invite_referrals_referrerId_idx` ON `contractor_invite_referrals` (`referrerId`);
