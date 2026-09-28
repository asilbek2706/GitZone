import {
  describe,
  expect,
  it,
} from 'vitest';

import { parseGitBasicAuthorization } from '../../../src/utils/git/basic-auth.js';

const encode = (
  value: string,
): string =>
  Buffer.from(value).toString(
    'base64',
  );

describe(
  'Git Basic authentication parser',
  () => {
    it('parses valid credentials', () => {
      expect(
        parseGitBasicAuthorization(
          `Basic ${encode(
            'testuser:gzp_token',
          )}`,
        ),
      ).toEqual({
        username: 'testuser',
        password: 'gzp_token',
      });
    });

    it('accepts case-insensitive Basic scheme', () => {
      expect(
        parseGitBasicAuthorization(
          `basic ${encode(
            'testuser:gzp_token',
          )}`,
        ),
      ).toEqual({
        username: 'testuser',
        password: 'gzp_token',
      });
    });

    it('allows colon inside password', () => {
      expect(
        parseGitBasicAuthorization(
          `Basic ${encode(
            'testuser:abc:def',
          )}`,
        ),
      ).toEqual({
        username: 'testuser',
        password: 'abc:def',
      });
    });

    it.each([
      undefined,
      '',
      'Bearer abc',
      'Basic',
      'Basic !!!',
      'Basic A',
    ])(
      'rejects malformed header %s',
      (authorization) => {
        expect(
          parseGitBasicAuthorization(
            authorization,
          ),
        ).toBeNull();
      },
    );

    it('rejects credentials without separator', () => {
      expect(
        parseGitBasicAuthorization(
          `Basic ${encode(
            'testuser',
          )}`,
        ),
      ).toBeNull();
    });

    it('rejects empty username', () => {
      expect(
        parseGitBasicAuthorization(
          `Basic ${encode(
            ':password',
          )}`,
        ),
      ).toBeNull();
    });

    it('rejects empty password', () => {
      expect(
        parseGitBasicAuthorization(
          `Basic ${encode(
            'testuser:',
          )}`,
        ),
      ).toBeNull();
    });

    it('rejects embedded newline', () => {
      expect(
        parseGitBasicAuthorization(
          `Basic ${encode(
            'testuser:token\nbad',
          )}`,
        ),
      ).toBeNull();
    });

    it('rejects embedded NUL byte', () => {
      expect(
        parseGitBasicAuthorization(
          `Basic ${encode(
            'testuser:token\0bad',
          )}`,
        ),
      ).toBeNull();
    });
  },
);
