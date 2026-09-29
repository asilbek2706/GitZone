import { AppError } from '../../errors/app.error.js';

const containsControlCharacter = (
  value: string,
): boolean => {
  for (const character of value) {
    const code =
      character.charCodeAt(0);

    if (
      code <= 0x1f ||
      code === 0x7f
    ) {
      return true;
    }
  }

  return false;
};

export const isSafeGitTreePath = (
  value: string,
): boolean => {
  if (value.length > 4096) {
    return false;
  }

  if (value === '') {
    return true;
  }

  if (
    value.startsWith('/') ||
    value.endsWith('/') ||
    value.includes('\\') ||
    containsControlCharacter(value)
  ) {
    return false;
  }

  const segments =
    value.split('/');

  return !segments.some(
    (segment) =>
      segment.length === 0 ||
      segment === '.' ||
      segment === '..',
  );
};

export const assertSafeGitTreePath = (
  value: string,
): void => {
  if (!isSafeGitTreePath(value)) {
    throw new AppError(
      'Invalid Git tree path',
      400,
      'INVALID_GIT_TREE_PATH',
    );
  }
};
