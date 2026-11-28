const OPTIONS = [
  ["ready", "Available"],
  ["loading", "Loading"],
  ["empty", "No times"],
  ["error", "Error"],
];

export default function StatePreview({ value, onChange }) {
  return (
    <fieldset className="state-preview">
      <legend>Preview state</legend>
      <div className="preview-options">
        {OPTIONS.map(([state, label]) => (
          <button
            className={value === state ? "is-active" : ""}
            key={state}
            type="button"
            aria-pressed={value === state}
            onClick={() => onChange(state)}
          >
            {label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
