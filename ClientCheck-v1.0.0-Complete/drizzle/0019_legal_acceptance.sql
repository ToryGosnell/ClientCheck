-- Add legal acceptance tracking columns to users table
ALTER TABLE `users` ADD COLUMN `termsAcceptedAt` timestamp NULL;
ALTER TABLE `users` ADD COLUMN `privacyAcceptedAt` timestamp NULL;
ALTER TABLE `users` ADD COLUMN `legalAcceptanceVersion` varchar(32) NULL;
