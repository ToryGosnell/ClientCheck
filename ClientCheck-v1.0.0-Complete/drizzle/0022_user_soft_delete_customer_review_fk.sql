-- Soft delete + safer FKs: contractor account closure keeps customers and reviews.
-- Run after backup. If ADD CONSTRAINT fails (orphan IDs), fix data first or comment FK lines.

ALTER TABLE `users`
  ADD COLUMN `deletedAt` timestamp NULL DEFAULT NULL,
  ADD COLUMN `accountStatus` enum('active','deleted','suspended') NOT NULL DEFAULT 'active';

-- Allow creator / author user rows to be hard-removed without deleting customer or review rows.
ALTER TABLE `customers` MODIFY COLUMN `createdByUserId` int NULL;
ALTER TABLE `reviews` MODIFY COLUMN `contractorUserId` int NULL;

-- Defense in depth: only if no conflicting constraint names exist.
ALTER TABLE `customers`
  ADD CONSTRAINT `fk_customers_created_by_user`
  FOREIGN KEY (`createdByUserId`) REFERENCES `users` (`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `reviews`
  ADD CONSTRAINT `fk_reviews_contractor_user`
  FOREIGN KEY (`contractorUserId`) REFERENCES `users` (`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
