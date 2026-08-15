import { verification_token_type } from '../generated/prisma/client';

export const verification_token_expires: Record<
  verification_token_type,
  number
> = {
  EMAIL_VERIFICATION: 15 * 60 * 1000,
};

export const getSessionExpiry = () => {
  return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
};
