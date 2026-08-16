import { verification_token_type } from '../generated/prisma/enums';

export const RedisKeys = {
  getUserById: (id: string) => `user:id:${id}`,
  getUserByEmail: (email: string) => `user:email:${email}`,
  verificationToken: (type: verification_token_type, tokenId: string) =>
    `verification:${type}:${tokenId}`,
  verificationTokenById: (id: string) => `verification-token:id:${id}`,
  sessionById: (id: string) => `session:id:${id}`,
} as const;
