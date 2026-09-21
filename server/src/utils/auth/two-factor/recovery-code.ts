import crypto from 'node:crypto';

const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_BYTES = 16;

export interface RecoveryCodePair {
  code: string;
  codeHash: string;
}

export const normalizeRecoveryCode = (code: string): string => {
  return code.trim().toLowerCase();
};

export const hashRecoveryCode = (code: string): string => {
  return crypto
    .createHash('sha256')
    .update(normalizeRecoveryCode(code), 'utf8')
    .digest('hex');
};

export const generateRecoveryCodes = (): RecoveryCodePair[] => {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    const code = crypto.randomBytes(RECOVERY_CODE_BYTES).toString('hex');

    return {
      code,
      codeHash: hashRecoveryCode(code),
    };
  });
};
