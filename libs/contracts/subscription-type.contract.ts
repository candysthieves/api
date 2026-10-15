export const SUBSCRIPTION_TYPES = {
  PERSONAL: 'Personal',
  BUSINESS: 'Business',
} as const;

export type SubscriptionTypeName =
  (typeof SUBSCRIPTION_TYPES)[keyof typeof SUBSCRIPTION_TYPES];

export type SubscriptionTypeContract = {
  type: SubscriptionTypeName;
};
