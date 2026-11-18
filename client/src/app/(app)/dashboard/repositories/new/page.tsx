'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import {
  FiArrowLeft,
  FiBook,
  FiCheck,
  FiLock,
  FiGlobe,
  FiInfo,
  FiPlus,
  FiShield,
} from 'react-icons/fi';

import Link from 'next/link';
import { repositoryService } from '@/services/repository.service';
import styles from './CreateRepositoryPage.module.css';

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
  if (isAxiosError(error)) {
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

export default function CreateRepositoryPage() {
  const router = useRouter();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const nameError = submitted ? validateRepositoryName(name) : null;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link href="/dashboard/repositories" className={styles.backLink}>
          <FiArrowLeft size={16} />
          <span>Repositories</span>
        </Link>

        <div className={styles.heading}>
          <div className={styles.headingIcon}>
            <FiPlus size={21} />
          </div>

          <div>
            <h1>Create a new repository</h1>
            <p>A repository contains all of your project files and revision history.</p>
          </div>
        </div>
      </div>

      <div className={styles.content}>
        <form className={styles.form} onSubmit={handleSubmit} noValidate>
          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div>
                <h2>General information</h2>
                <p>Choose a name and add a short description.</p>
              </div>
              <span className={styles.requiredLabel}>Required fields marked *</span>
            </div>

            <div className={styles.field}>
              <label htmlFor="repository-name">
                Repository name <span className={styles.required}>*</span>
              </label>

              <div className={`${styles.inputWrapper} ${nameError ? styles.inputError : ''}`}>
                <FiBook className={styles.inputIcon} size={17} />

                <input
                  id="repository-name"
                  name="name"
                  type="text"
                  placeholder="my-awesome-project"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  autoComplete="off"
                  autoFocus
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={nameError ? 'name-error' : 'name-help'}
                  disabled={isSubmitting}
                />

                <span className={styles.inputCounter}>{name.length}/100</span>
              </div>

              {nameError ? (
                <p id="name-error" className={styles.errorText}>
                  {nameError}
                </p>
              ) : (
                <p id="name-help" className={styles.helperText}>
                  Use letters, numbers, dots, underscores and hyphens.
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label htmlFor="repository-description">
                Description <span className={styles.optionalLabel}>Optional</span>
              </label>

              <textarea
                id="repository-description"
                name="description"
                placeholder="What is this repository about?"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={500}
                rows={4}
                disabled={isSubmitting}
              />

              <div className={styles.textareaFooter}>
                <p className={styles.helperText}>
                  Keep it short and make your project easy to understand.
                </p>
                <span className={styles.characterCount}>{description.length}/500</span>
              </div>
            </div>
          </section>

          <div className={styles.divider} />

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <div>
                <h2>Visibility</h2>
                <p>Choose who can access your repository.</p>
              </div>
            </div>

            <div className={styles.visibilityOptions}>
              <button
                type="button"
                className={`${styles.visibilityCard} ${!isPrivate ? styles.selected : ''}`}
                onClick={() => setIsPrivate(false)}
                aria-pressed={!isPrivate}
                disabled={isSubmitting}
              >
                <span className={styles.visibilityIcon}>
                  <FiGlobe size={20} />
                </span>

                <span className={styles.visibilityContent}>
                  <strong>Public</strong>
                  <span>Anyone can see this repository.</span>
                </span>

                <span className={styles.radioIndicator}>{!isPrivate && <FiCheck size={13} />}</span>
              </button>

              <button
                type="button"
                className={`${styles.visibilityCard} ${isPrivate ? styles.selected : ''}`}
                onClick={() => setIsPrivate(true)}
                aria-pressed={isPrivate}
                disabled={isSubmitting}
              >
                <span className={styles.visibilityIcon}>
                  <FiLock size={20} />
                </span>

                <span className={styles.visibilityContent}>
                  <strong>Private</strong>
                  <span>Only you and authorized collaborators can access it.</span>
                </span>

                <span className={styles.radioIndicator}>{isPrivate && <FiCheck size={13} />}</span>
              </button>
            </div>
          </section>

          <div className={styles.notice}>
            <FiInfo size={17} />
            <p>
              A Git repository will be initialized automatically when you create this repository.
            </p>
          </div>

          <div className={styles.actions}>
            <Link href="/dashboard/repositories" className={styles.cancelButton}>
              Cancel
            </Link>

            <button type="submit" className={styles.submitButton} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className={styles.spinner} />
                  Creating repository...
                </>
              ) : (
                <>
                  <FiPlus size={17} />
                  Create repository
                </>
              )}
            </button>
          </div>
        </form>

        <aside className={styles.sidebar}>
          <div className={styles.sidebarCard}>
            <div className={styles.sidebarIcon}>
              <FiShield size={20} />
            </div>

            <h3>Your code, your control.</h3>
            <p>GitZone gives you control over your source code and who can access your work.</p>

            <div className={styles.sidebarDivider} />

            <div className={styles.sidebarFeature}>
              <FiCheck size={15} />
              <span>Secure repository creation</span>
            </div>

            <div className={styles.sidebarFeature}>
              <FiCheck size={15} />
              <span>Public and private access</span>
            </div>

            <div className={styles.sidebarFeature}>
              <FiCheck size={15} />
              <span>Git initialized automatically</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
