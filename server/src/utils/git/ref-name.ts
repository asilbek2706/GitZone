export const isSafeGitRefName = (value: string): boolean => {
  if (
    value.length === 0 ||
    value.length > 255 ||
    value === '@' ||
    value.startsWith('-') ||
    value.startsWith('/') ||
    value.endsWith('/') ||
    value.endsWith('.') ||
    value.includes('..') ||
    value.includes('//') ||
    value.includes('@{')
  ) {
    return false;
  }

  for (const character of value) {
    const code = character.charCodeAt(0);

    if (
      code <= 0x20 ||
      code === 0x7f ||
      character === '~' ||
      character === '^' ||
      character === ':' ||
      character === '?' ||
      character === '*' ||
      character === '[' ||
      character === '\\'
    ) {
      return false;
    }
  }

  return value.split('/').every(
    (component) =>
      component.length > 0 &&
      !component.startsWith('.') &&
      !component.toLowerCase().endsWith('.lock'),
  );
};
