import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import app from '../../../src/app.js';
import { AppError } from '../../../src/errors/app.error.js';

import {
  createSshKey,
  getSshKeys,
  revokeSshKey,
} from '../../../src/services/auth/ssh-key.service.js';

import { verifyAccessToken } from '../../../src/utils/auth/tokens.js';

vi.mock('../../../src/services/auth/ssh-key.service.js', () => ({
  createSshKey: vi.fn(),
  getSshKeys: vi.fn(),
  revokeSshKey: vi.fn(),
}));

vi.mock('../../../src/utils/auth/tokens.js', () => ({
  verifyAccessToken: vi.fn(),
}));

const mockedCreateSshKey = vi.mocked(createSshKey);
const mockedGetSshKeys = vi.mocked(getSshKeys);
const mockedRevokeSshKey = vi.mocked(revokeSshKey);
const mockedVerifyAccessToken = vi.mocked(verifyAccessToken);

const createdAt = new Date('2026-11-13T10:00:00.000Z');

const sshKey = {
  id: 'ssh-key-1',
  name: 'Windows Laptop',
  fingerprint: 'SHA256:test-fingerprint',
  keyType: 'ssh-ed25519',
  lastUsedAt: null,
  createdAt,
};

const validPayload = {
  name: 'Windows Laptop',
  publicKey: `ssh-ed25519 ${Buffer.from('test-public-key').toString('base64')} asilbek@gitzone`,
};

const authenticatedRequest = () => ({
  set: (key: string, value: string) => request(app).get('/api/auth/ssh-keys').set(key, value),
});

describe('SSH key API integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockedVerifyAccessToken.mockReturnValue({
      sub: 'user-1',
    } as never);
  });

  describe('POST /api/auth/ssh-keys', () => {
    it('creates an SSH key for authenticated user', async () => {
      mockedCreateSshKey.mockResolvedValue(sshKey as never);

      const response = await request(app)
        .post('/api/auth/ssh-keys')
        .set('Authorization', 'Bearer test-access-token')
        .send(validPayload);

      expect(response.status).toBe(201);

      expect(mockedVerifyAccessToken).toHaveBeenCalledWith('test-access-token');

      expect(mockedCreateSshKey).toHaveBeenCalledWith(
        'user-1',
        'Windows Laptop',
        validPayload.publicKey,
      );

      expect(response.body).toEqual({
        success: true,
        data: {
          sshKey: {
            ...sshKey,
            createdAt: createdAt.toISOString(),
          },
        },
      });
    });

    it('rejects SSH key creation without authentication', async () => {
      const response = await request(app).post('/api/auth/ssh-keys').send(validPayload);

      expect(response.status).toBe(401);

      expect(mockedVerifyAccessToken).not.toHaveBeenCalled();
      expect(mockedCreateSshKey).not.toHaveBeenCalled();
    });

    it('rejects invalid SSH public key payload', async () => {
      const response = await request(app)
        .post('/api/auth/ssh-keys')
        .set('Authorization', 'Bearer test-access-token')
        .send({
          ...validPayload,
          publicKey: 'invalid-public-key',
        });

      expect(response.status).toBe(400);

      expect(response.body).toMatchObject({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
        },
      });

      expect(mockedCreateSshKey).not.toHaveBeenCalled();
    });

    it('rejects unauthorized fields in the request body', async () => {
      const response = await request(app)
        .post('/api/auth/ssh-keys')
        .set('Authorization', 'Bearer test-access-token')
        .send({
          ...validPayload,
          userId: 'another-user',
          fingerprint: 'SHA256:fake',
        });

      expect(response.status).toBe(400);

      expect(mockedCreateSshKey).not.toHaveBeenCalled();
    });

    it('returns 409 when SSH key already exists', async () => {
      mockedCreateSshKey.mockRejectedValue(
        new AppError('This SSH key has already been added', 409, 'SSH_KEY_ALREADY_EXISTS'),
      );

      const response = await request(app)
        .post('/api/auth/ssh-keys')
        .set('Authorization', 'Bearer test-access-token')
        .send(validPayload);

      expect(response.status).toBe(409);

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'SSH_KEY_ALREADY_EXISTS',
          message: 'This SSH key has already been added',
        },
      });
    });
  });

  describe('GET /api/auth/ssh-keys', () => {
    it('returns SSH keys belonging to authenticated user', async () => {
      mockedGetSshKeys.mockResolvedValue([sshKey] as never);

      const response = await authenticatedRequest().set(
        'Authorization',
        'Bearer test-access-token',
      );

      expect(response.status).toBe(200);

      expect(mockedVerifyAccessToken).toHaveBeenCalledWith('test-access-token');
      expect(mockedGetSshKeys).toHaveBeenCalledWith('user-1');

      expect(response.body).toEqual({
        success: true,
        data: {
          sshKeys: [
            {
              ...sshKey,
              createdAt: createdAt.toISOString(),
            },
          ],
        },
      });

      expect(response.body.data.sshKeys[0]).not.toHaveProperty('privateKey');
      expect(response.body.data.sshKeys[0]).not.toHaveProperty('token');
    });

    it('returns an empty list when the user has no SSH keys', async () => {
      mockedGetSshKeys.mockResolvedValue([] as never);

      const response = await request(app)
        .get('/api/auth/ssh-keys')
        .set('Authorization', 'Bearer test-access-token');

      expect(response.status).toBe(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          sshKeys: [],
        },
      });
    });

    it('rejects listing SSH keys without authentication', async () => {
      const response = await request(app).get('/api/auth/ssh-keys');

      expect(response.status).toBe(401);

      expect(mockedGetSshKeys).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/auth/ssh-keys/:keyId', () => {
    it('revokes an SSH key belonging to authenticated user', async () => {
      mockedRevokeSshKey.mockResolvedValue(undefined);

      const response = await request(app)
        .delete('/api/auth/ssh-keys/ssh-key-1')
        .set('Authorization', 'Bearer test-access-token');

      expect(response.status).toBe(200);

      expect(mockedVerifyAccessToken).toHaveBeenCalledWith('test-access-token');

      expect(mockedRevokeSshKey).toHaveBeenCalledWith('user-1', 'ssh-key-1');

      expect(response.body).toEqual({
        success: true,
        message: 'SSH key revoked successfully',
      });
    });

    it('rejects revoking an SSH key without authentication', async () => {
      const response = await request(app).delete('/api/auth/ssh-keys/ssh-key-1');

      expect(response.status).toBe(401);

      expect(mockedRevokeSshKey).not.toHaveBeenCalled();
    });

    it('returns 404 when SSH key does not belong to authenticated user', async () => {
      mockedRevokeSshKey.mockRejectedValue(
        new AppError('SSH key not found', 404, 'SSH_KEY_NOT_FOUND'),
      );

      const response = await request(app)
        .delete('/api/auth/ssh-keys/ssh-key-1')
        .set('Authorization', 'Bearer test-access-token');

      expect(response.status).toBe(404);

      expect(mockedRevokeSshKey).toHaveBeenCalledWith('user-1', 'ssh-key-1');

      expect(response.body).toEqual({
        success: false,
        error: {
          code: 'SSH_KEY_NOT_FOUND',
          message: 'SSH key not found',
        },
      });
    });
  });
});
