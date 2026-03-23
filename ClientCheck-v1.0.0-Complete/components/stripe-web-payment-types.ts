export type StripeWebPaymentSectionProps = {
  publishableKey: string;
  clientSecret: string;
  returnUrl: string;
  onPaymentSucceeded: () => void;
  onError: (message: string) => void;
};
