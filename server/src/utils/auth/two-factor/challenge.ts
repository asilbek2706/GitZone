import crypto from 'node:crypto';

const CHALLENGE_TOKEN_BYTES = 32;
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export interface TwoFactorChallengeToken {
  token: string;
  tokenHash: string;
  expiresAt: Date;
}

export const hashTwoFactorChallengeToken = (token: string): string => {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
};

export const generateTwoFactorChallengeToken = (): TwoFactorChallengeToken => {
  const token = crypto.randomBytes(CHALLENGE_TOKEN_BYTES).toString('base64url');

  return {
    token,
    tokenHash: hashTwoFactorChallengeToken(token),
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  };
};
