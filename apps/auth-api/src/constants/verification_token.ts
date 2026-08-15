import { verification_token_type } from '../generated/prisma/client';

export const verification_token_expires: Record<
  verification_token_type,
  number
> = {
  EMAIL_VERIFICATION: 15 * 60 * 1000,
};

export const getVerificationTokenExpiry = (type: verification_token_type) => {
  return new Date(Date.now() + verification_token_expires[type]);
};
