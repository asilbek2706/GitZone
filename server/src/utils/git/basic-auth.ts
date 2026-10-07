export type GitBasicCredentials = {
  username: string;
  password: string;
};

const BASIC_AUTH_PATTERN = /^Basic[ \t]+([A-Za-z0-9+/]+={0,2})$/i;

const decodeStrictBase64 = (encoded: string): string | null => {
  if (encoded.length === 0 || encoded.length % 4 === 1) {
    return null;
  }

  try {
    const decodedBuffer = Buffer.from(encoded, 'base64');

    if (decodedBuffer.length === 0) {
      return null;
    }

    const normalizedInput = encoded.replace(/=+$/, '');

    const normalizedDecoded = decodedBuffer.toString('base64').replace(/=+$/, '');

    if (normalizedDecoded !== normalizedInput) {
      return null;
    }

    return decodedBuffer.toString('utf8');
  } catch {
    return null;
  }
};

export const parseGitBasicAuthorization = (
  authorization: string | undefined,
): GitBasicCredentials | null => {
  if (!authorization) {
    return null;
  }

  const match = BASIC_AUTH_PATTERN.exec(authorization);

  if (!match?.[1]) {
    return null;
  }

  const decoded = decodeStrictBase64(match[1]);

  if (
    decoded === null ||
    decoded.includes('\0') ||
    decoded.includes('\r') ||
    decoded.includes('\n')
  ) {
    return null;
  }

  const separatorIndex = decoded.indexOf(':');

  if (separatorIndex <= 0) {
    return null;
  }

  const username = decoded.slice(0, separatorIndex);

  const password = decoded.slice(separatorIndex + 1);

  if (username.length === 0 || password.length === 0) {
    return null;
  }

  return {
    username,
    password,
  };
};
