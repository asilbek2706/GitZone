const DURATION_PATTERN = /^(\d+)(ms|s|m|h|d)$/i;

const UNIT_TO_MILLISECONDS = {
  ms: 1,
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
} as const;

export const parseDurationToMilliseconds = (duration: string): number => {
  const match = DURATION_PATTERN.exec(duration.trim());

  if (!match) {
    throw new Error(`Invalid duration format: ${duration}`);
  }

  const value = Number(match[1]);
  const unit = match[2]?.toLowerCase() as keyof typeof UNIT_TO_MILLISECONDS;

  const milliseconds = value * UNIT_TO_MILLISECONDS[unit];

  if (!Number.isSafeInteger(milliseconds) || milliseconds <= 0) {
    throw new Error(`Invalid duration value: ${duration}`);
  }

  return milliseconds;
};
