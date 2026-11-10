interface RepositoryDescriptionFieldProps {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

export default function RepositoryDescriptionField({
  value,
  disabled,
  onChange,
}: RepositoryDescriptionFieldProps) {
  return (
    <div className="create-field">
      <label htmlFor="repository-description">
        Description <span className="create-optional">Optional</span>
      </label>

      <textarea
        id="repository-description"
        name="description"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="What is this repository about?"
        maxLength={500}
        rows={4}
        disabled={disabled}
      />

      <div className="create-field-footer">
        <p className="create-hint">Describe your project briefly.</p>
        <span className="create-counter">{value.length}/500</span>
      </div>
    </div>
  );
}
