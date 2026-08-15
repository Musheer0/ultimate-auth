import { verification_token_type } from "../generated/prisma/enums";

export const RedisExpiry = {
  USER: 60 * 15, // 15 minutes
    [verification_token_type.EMAIL_VERIFICATION]: 60 * 15, // 15 min
  [verification_token_type.RESET_PASSWORD]: 60 * 10, // 10 min
    verificationTokenById: 60 * 15, // 15 minutes
  session: 60 * 60 * 24, // 24 hours

} as const;