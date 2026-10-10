import { randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import { access, lstat, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import sharp from 'sharp';

import { env } from '../../config/env.js';
import { AppError } from '../../errors/app.error.js';
import { MAX_AVATAR_SIZE_BYTES } from '../../middleware/avatar-upload.middleware.js';

const MAX_AVATAR_PIXELS = 20_000_000;
const MAX_AVATAR_DIMENSION = 10_000;
const AVATAR_OUTPUT_SIZE = 512;

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);

export type StoredAvatar = {
  filename: string;
  avatarUrl: string;
  absolutePath: string;
};

const getAvatarStorageDirectory = (): string => {
  return path.resolve(process.cwd(), 'storage', 'avatars');
};

export const assertAvatarStorageIsolated = (): void => {
  const avatarRoot = getAvatarStorageDirectory();
  const gitRoot = path.resolve(process.cwd(), env.GIT_STORAGE_PATH);

  const avatarInsideGit = path.relative(gitRoot, avatarRoot);
  const gitInsideAvatar = path.relative(avatarRoot, gitRoot);

  const isInside = (relativePath: string): boolean =>
    relativePath === '' ||
    (!relativePath.startsWith(`..${path.sep}`) &&
      relativePath !== '..' &&
      !path.isAbsolute(relativePath));

  if (isInside(avatarInsideGit) || isInside(gitInsideAvatar)) {
    throw new AppError(
      'Avatar storage must be isolated from Git repository storage',
      500,
      'AVATAR_STORAGE_NOT_ISOLATED',
    );
  }
};
const ensureSafeAvatarDirectory = async (directory: string): Promise<void> => {
  const parsed = path.parse(directory);
  const relative = path.relative(parsed.root, directory);
  const segments = relative.split(path.sep).filter(Boolean);

  let current = parsed.root;

  for (const segment of segments) {
    current = path.join(current, segment);

    try {
      const stats = await lstat(current);

      if (!stats.isDirectory() || stats.isSymbolicLink()) {
        throw new AppError('Unsafe avatar storage directory', 500, 'AVATAR_STORAGE_UNSAFE');
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
        try {
          await mkdir(current);
        } catch (mkdirError) {
          if (
            !(mkdirError instanceof Error) ||
            !('code' in mkdirError) ||
            mkdirError.code !== 'EEXIST'
          ) {
            throw mkdirError;
          }
        }

        const stats = await lstat(current);

        if (!stats.isDirectory() || stats.isSymbolicLink()) {
          throw new AppError('Unsafe avatar storage directory', 500, 'AVATAR_STORAGE_UNSAFE');
        }

        continue;
      }

      throw error;
    }
  }
};

export const processAndStoreAvatar = async (
  buffer: Buffer,
  mimeType: string,
): Promise<StoredAvatar> => {
  if (buffer.length === 0 || buffer.length > MAX_AVATAR_SIZE_BYTES) {
    throw new AppError('Invalid avatar file size', 413, 'INVALID_AVATAR_SIZE');
  }

  let output: Buffer;

  try {
    const image = sharp(buffer, {
      failOn: 'error',
      limitInputPixels: MAX_AVATAR_PIXELS,
      animated: false,
    });

    const metadata = await image.metadata();

    const expectedFormats: Record<string, string> = {
      'image/jpeg': 'jpeg',
      'image/png': 'png',
      'image/webp': 'webp',
    };

    if (
      !Object.prototype.hasOwnProperty.call(expectedFormats, mimeType) ||
      metadata.format !== expectedFormats[mimeType]
    ) {
      throw new AppError(
        'Avatar MIME type does not match image content',
        415,
        'AVATAR_MIME_MISMATCH',
      );
    }

    if (
      !metadata.format ||
      !ALLOWED_FORMATS.has(metadata.format) ||
      !metadata.width ||
      !metadata.height ||
      metadata.width > MAX_AVATAR_DIMENSION ||
      metadata.height > MAX_AVATAR_DIMENSION ||
      metadata.width * metadata.height > MAX_AVATAR_PIXELS ||
      (metadata.pages ?? 1) > 1
    ) {
      throw new AppError('Unsupported or unsafe avatar image', 415, 'INVALID_AVATAR_IMAGE');
    }

    output = await sharp(buffer, {
      failOn: 'error',
      limitInputPixels: MAX_AVATAR_PIXELS,
      animated: false,
    })
      .rotate()
      .resize({
        width: AVATAR_OUTPUT_SIZE,
        height: AVATAR_OUTPUT_SIZE,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 82 })
      .toBuffer();
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }

    throw new AppError('Invalid or corrupted avatar image', 415, 'INVALID_AVATAR_IMAGE');
  }

  assertAvatarStorageIsolated();

  const directory = getAvatarStorageDirectory();

  await ensureSafeAvatarDirectory(directory);

  const filename = `${randomUUID()}.webp`;
  const absolutePath = path.join(directory, filename);

  await writeFile(absolutePath, output, {
    flag: 'wx',
    mode: 0o600,
  });

  await access(absolutePath, constants.R_OK);

  return {
    filename,
    avatarUrl: `/api/users/avatars/${filename}`,
    absolutePath,
  };
};
