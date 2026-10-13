export type ProfileViewType = {
  id: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  isEmailConfirmed: boolean;
  subscription_type: 'Personal' | 'Business';
};
