import { FiCheck, FiGlobe, FiLock } from 'react-icons/fi';

interface RepositoryVisibilitySelectorProps {
  isPrivate: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}

export default function RepositoryVisibilitySelector({
  isPrivate,
  disabled,
  onChange,
}: RepositoryVisibilitySelectorProps) {
  return (
    <div className="create-visibility-options">
      <button
        type="button"
        className={`create-visibility-card ${!isPrivate ? 'selected' : ''}`}
        onClick={() => onChange(false)}
        aria-pressed={!isPrivate}
        disabled={disabled}
      >
        <FiGlobe size={20} />

        <span>
          <strong>Public</strong>
          <small>Anyone can see this repository.</small>
        </span>

        <span className="create-radio">{!isPrivate && <FiCheck size={14} />}</span>
      </button>

      <button
        type="button"
        className={`create-visibility-card ${isPrivate ? 'selected' : ''}`}
        onClick={() => onChange(true)}
        aria-pressed={isPrivate}
        disabled={disabled}
      >
        <FiLock size={20} />

        <span>
          <strong>Private</strong>
          <small>Only you and authorized collaborators can access it.</small>
        </span>

        <span className="create-radio">{isPrivate && <FiCheck size={14} />}</span>
      </button>
    </div>
  );
}
