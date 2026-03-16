import { relations } from "drizzle-orm";
import { contractorProfiles, customers, reviewHelpfulVotes, reviews, users } from "./schema";

export const usersRelations = relations(users, ({ one, many }) => ({
  contractorProfile: one(contractorProfiles, {
    fields: [users.id],
    references: [contractorProfiles.userId],
  }),
  reviews: many(reviews),
  createdCustomers: many(customers),
}));

export const contractorProfilesRelations = relations(contractorProfiles, ({ one }) => ({
  user: one(users, {
    fields: [contractorProfiles.userId],
    references: [users.id],
  }),
}));

export const customersRelations = relations(customers, ({ one, many }) => ({
  createdBy: one(users, {
    fields: [customers.createdByUserId],
    references: [users.id],
  }),
  reviews: many(reviews),
}));

export const reviewsRelations = relations(reviews, ({ one, many }) => ({
  customer: one(customers, {
    fields: [reviews.customerId],
    references: [customers.id],
  }),
  contractor: one(users, {
    fields: [reviews.contractorUserId],
    references: [users.id],
  }),
  helpfulVotes: many(reviewHelpfulVotes),
}));

export const reviewHelpfulVotesRelations = relations(reviewHelpfulVotes, ({ one }) => ({
  review: one(reviews, {
    fields: [reviewHelpfulVotes.reviewId],
    references: [reviews.id],
  }),
  user: one(users, {
    fields: [reviewHelpfulVotes.userId],
    references: [users.id],
  }),
}));
