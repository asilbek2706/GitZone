import { describe, expect, it } from 'vitest';

import { parseGitSshCommand } from '../../../src/utils/git/ssh-command.js';

describe('parseGitSshCommand', () => {
  it('parses a Git upload-pack command', () => {
    expect(parseGitSshCommand("git-upload-pack 'asilbek/my-repo.git'")).toEqual({
      service: 'UPLOAD_PACK',
      namespace: 'asilbek',
      repositoryName: 'my-repo',
    });
  });

  it('parses a Git receive-pack command', () => {
    expect(parseGitSshCommand("git-receive-pack 'asilbek/my-repo.git'")).toEqual({
      service: 'RECEIVE_PACK',
      namespace: 'asilbek',
      repositoryName: 'my-repo',
    });
  });

  it('supports organization namespaces', () => {
    expect(parseGitSshCommand("git-upload-pack 'gitzone-platform/backend.git'")).toEqual({
      service: 'UPLOAD_PACK',
      namespace: 'gitzone-platform',
      repositoryName: 'backend',
    });
  });

  it('supports dots, underscores and hyphens in repository names', () => {
    expect(parseGitSshCommand("git-upload-pack 'asilbek/project_v2.test.git'")).toEqual({
      service: 'UPLOAD_PACK',
      namespace: 'asilbek',
      repositoryName: 'project_v2.test',
    });
  });

  it('supports repository names that already end in .git', () => {
    expect(parseGitSshCommand("git-upload-pack 'asilbek/project.git.git'")).toEqual({
      service: 'UPLOAD_PACK',
      namespace: 'asilbek',
      repositoryName: 'project.git',
    });
  });

  it('accepts Git client commands with one leading slash', () => {
    expect(parseGitSshCommand("git-upload-pack '/asilbek/my-repo.git'")).toEqual({
      service: 'UPLOAD_PACK',
      namespace: 'asilbek',
      repositoryName: 'my-repo',
    });

    expect(parseGitSshCommand("git-receive-pack '/asilbek/my-repo.git'")).toEqual({
      service: 'RECEIVE_PACK',
      namespace: 'asilbek',
      repositoryName: 'my-repo',
    });
  });

  it.each([
    "git-upload-pack '//asilbek/repo.git'",
    "git-receive-pack '///asilbek/repo.git'",
  ])('rejects commands with multiple leading slashes: %s', (command) => {
    expect(parseGitSshCommand(command)).toBeNull();
  });

  it.each([
    '',
    'bash',
    'sh',
    'git',
    "git-upload-pack 'asilbek/repo'",
    "git-upload-pack 'asilbek/repo.git",
    'git-upload-pack asilbek/repo.git',
    "git-upload-pack 'asilbek/repo.git' --exec=whoami",
    "git-upload-pack 'asilbek/repo.git'; whoami",
    "git-receive-pack 'asilbek/repo.git' && whoami",
    "git-upload-pack '../../etc/passwd.git'",
    "git-upload-pack 'asilbek/../repo.git'",
    "git-upload-pack './repo.git'",
    "git-upload-pack 'asilbek/.git'",
    "git-upload-pack 'asilbek/repo.git'\nwhoami",
  ])('rejects an invalid or unsafe command: %s', (command) => {
    expect(parseGitSshCommand(command)).toBeNull();
  });

  it('rejects commands larger than the configured limit', () => {
    const command = `git-upload-pack 'asilbek/${'a'.repeat(4100)}.git'`;

    expect(parseGitSshCommand(command)).toBeNull();
  });
});
