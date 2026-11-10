'use client';

import './RepositoryCreate.css';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { FiArrowLeft, FiPlus, FiShield } from 'react-icons/fi';
import Link from 'next/link';

import { repositoryService } from '@/services/repository.service';

import RepositoryNameField from './RepositoryNameField';
import RepositoryDescriptionField from './RepositoryDescriptionField';
import RepositoryVisibilitySelector from './RepositoryVisibilitySelector';

const RESERVED_NAMES = new Set(['.', '..', '.git']);
const NAME_PATTERN = /^[a-zA-Z0-9._-]+$/;

function validateRepositoryName(name: string): string | null {
  const value = name.trim();

  if (!value) return 'Repository name is required.';
  if (value.length > 100) return 'Name must be at most 100 characters.';
  if (!NAME_PATTERN.test(value)) {
    return 'Use only letters, numbers, dots, underscores and hyphens.';
  }
  if (RESERVED_NAMES.has(value.toLowerCase())) {
    return 'This repository name is reserved.';
  }
  if (value.toLowerCase().endsWith('.git')) {
    return 'Repository name must not end with .git.';
  }
  if (value.includes('..')) {
    return 'Consecutive dots are not allowed.';
  }

  return null;
}

function getApiErrorMessage(error: unknown): string {
  if (isAxiosError<{ error?: { message?: string }; message?: string }>(error)) {
    const data = error.response?.data;

    if (typeof data?.error?.message === 'string') {
      return data.error.message;
    }

    if (typeof data?.message === 'string') {
      return data.message;
    }

    if (error.response?.status === 409) {
      return 'A repository with this name already exists.';
    }

    if (error.response?.status === 401) {
      return 'Your session has expired. Please sign in again.';
    }

    if (!error.response) {
      return 'Unable to connect to the server. Please try again.';
    }
  }

  return 'Something went wrong while creating your repository.';
}

export default function RepositoryCreateForm() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted ? validateRepositoryName(name) : null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitted(true);

    const validationError = validateRepositoryName(name);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    if (description.trim().length > 500) {
      toast.error('Description must be at most 500 characters.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await repositoryService.createRepository({
        name: name.trim(),
        description: description.trim() || undefined,
        isPrivate,
      });

      if (!response.success || !response.data?.repository) {
        throw new Error('Invalid repository creation response.');
      }

      toast.success('Repository created successfully.');
      router.push('/dashboard/repositories');
      router.refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="create-page">
      <div className="create-container">
        <Link href="/dashboard/repositories" className="create-back-link">
          <FiArrowLeft size={16} />
          Repositories
        </Link>

        <header className="create-header">
          <div>
            <span className="create-eyebrow">GITZONE / REPOSITORIES</span>
            <h1>Create a new repository</h1>
            <p>A repository contains your project files and revision history.</p>
          </div>
        </header>

        <div className="create-content">
          <form className="create-form" onSubmit={handleSubmit} noValidate>
            <section className="create-section">
              <div className="create-section-heading">
                <h2>General information</h2>
                <p>Choose a name and add an optional description.</p>
              </div>

              <RepositoryNameField
                value={name}
                error={nameError}
                disabled={isSubmitting}
                onChange={setName}
              />

              <RepositoryDescriptionField
                value={description}
                disabled={isSubmitting}
                onChange={setDescription}
              />
            </section>

            <section className="create-section">
              <div className="create-section-heading">
                <h2>Visibility</h2>
                <p>Choose who can access your repository.</p>
              </div>

              <RepositoryVisibilitySelector
                isPrivate={isPrivate}
                disabled={isSubmitting}
                onChange={setIsPrivate}
              />
            </section>

            <div className="create-notice">
              <FiShield size={17} />
              <p>GitZone will initialize a Git repository automatically.</p>
            </div>

            <div className="create-actions">
              <Link href="/dashboard/repositories" className="create-cancel">
                Cancel
              </Link>

              <button type="submit" className="create-submit" disabled={isSubmitting}>
                <FiPlus size={17} />
                {isSubmitting ? 'Creating...' : 'Create repository'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
