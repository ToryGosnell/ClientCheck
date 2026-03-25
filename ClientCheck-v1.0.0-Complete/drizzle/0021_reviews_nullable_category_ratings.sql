-- Allow NULL for per-category ratings when marked N/A (not stored as 0).
ALTER TABLE `reviews`
  MODIFY `ratingPaymentReliability` int NULL,
  MODIFY `ratingCommunication` int NULL,
  MODIFY `ratingScopeChanges` int NULL,
  MODIFY `ratingPropertyRespect` int NULL,
  MODIFY `ratingPermitPulling` int NULL,
  MODIFY `ratingOverallJobExperience` int NULL;
