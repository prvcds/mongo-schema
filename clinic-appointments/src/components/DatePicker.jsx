export default function DatePicker({ dates, selectedDate, onSelectDate }) {
  return (
    <section className="date-section" aria-labelledby="date-heading">
      <div className="section-heading">
        <div>
          <span className="step-label">STEP 1 OF 2</span>
          <h2 id="date-heading">Choose a date</h2>
        </div>
        <span className="timezone">All times local</span>
      </div>
      <div className="date-options" role="group" aria-label="Appointment date">
        {dates.map((date) => (
          <button
            className={`date-option${selectedDate === date.value ? " is-selected" : ""}`}
            key={date.value}
            type="button"
            aria-pressed={selectedDate === date.value}
            onClick={() => onSelectDate(date.value)}
          >
            <span>{date.weekday}</span>
            <strong>{date.day}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}
