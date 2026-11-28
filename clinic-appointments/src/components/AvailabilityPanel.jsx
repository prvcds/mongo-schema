const SAMPLE_TIMES = ["9:00 AM", "10:30 AM", "1:15 PM", "2:45 PM"];

function SlotButton({ time, isSelected, onSelect }) {
  return (
    <button
      className={`slot-option${isSelected ? " is-selected" : ""}`}
      type="button"
      aria-pressed={isSelected}
      onClick={() => onSelect(time)}
    >
      {time}
    </button>
  );
}

export default function AvailabilityPanel({
  status,
  selectedSlot,
  onSelectSlot,
  onRetry,
}) {
  return (
    <section className="availability-section" aria-labelledby="availability-heading">
      <div className="section-heading">
        <div>
          <span className="step-label">STEP 2 OF 2</span>
          <h2 id="availability-heading">Available times</h2>
        </div>
        <span className="visit-length">20 min visit</span>
      </div>

      {status === "loading" && (
        <div className="state-card loading-card" role="status" aria-live="polite">
          <span className="spinner" aria-hidden="true" />
          <span>
            <strong>Checking availability</strong>
            <small>Finding open appointment times…</small>
          </span>
        </div>
      )}

      {status === "empty" && (
        <div className="state-card" role="status">
          <span className="state-icon" aria-hidden="true">
            ◷
          </span>
          <div>
            <strong>No times available</strong>
            <p>Try another date to see more appointments.</p>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="state-card error-card" role="alert">
          <span className="state-icon" aria-hidden="true">
            !
          </span>
          <div>
            <strong>We couldn’t load appointment times</strong>
            <p>Your information is safe. Please try again.</p>
            <button className="text-button" type="button" onClick={onRetry}>
              Try again
            </button>
          </div>
        </div>
      )}

      {status === "ready" && (
        <>
          <p className="availability-note">Select a time that works for you.</p>
          <div className="slot-options" role="group" aria-label="Available appointment times">
            {SAMPLE_TIMES.map((time) => (
              <SlotButton
                key={time}
                time={time}
                isSelected={selectedSlot === time}
                onSelect={onSelectSlot}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
