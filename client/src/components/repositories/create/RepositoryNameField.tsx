interface RepositoryNameFieldProps {
  value: string;
  error: string | null;
  disabled: boolean;
  onChange: (value: string) => void;
}

export default function RepositoryNameField({
  value,
  error,
  disabled,
  onChange,
}: RepositoryNameFieldProps) {
  return (
    <div className="create-field">
      <label htmlFor="repository-name">
        Repository name <span aria-hidden="true">*</span>
      </label>

      <input
        id="repository-name"
        name="name"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="my-awesome-project"
        maxLength={100}
        autoComplete="off"
        autoFocus
        disabled={disabled}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? 'repository-name-error' : 'repository-name-help'}
      />

      {error ? (
        <p id="repository-name-error" className="create-error">
          {error}
        </p>
      ) : (
        <p id="repository-name-help" className="create-hint">
          Use letters, numbers, dots, underscores and hyphens.
        </p>
      )}

      <span className="create-counter">{value.length}/100</span>
    </div>
  );
}
