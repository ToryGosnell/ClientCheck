-- Customer Stripe identity verification (checkout.session.completed)
ALTER TABLE `users`
  ADD COLUMN `isVerified` BOOLEAN NOT NULL DEFAULT false AFTER `lastSignedIn`,
  ADD COLUMN `verifiedAt` TIMESTAMP NULL DEFAULT NULL AFTER `isVerified`;
