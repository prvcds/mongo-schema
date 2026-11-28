export default function AppointmentSummary({
  dateLabel,
  selectedSlot,
  onRequestAppointment,
  requestSent,
}) {
  return (
    <aside className="summary-card" aria-labelledby="summary-heading">
      <div className="summary-top">
        <span className="summary-icon" aria-hidden="true">
          ✓
        </span>
        <span>YOUR VISIT</span>
      </div>
      <h2 id="summary-heading">Appointment summary</h2>
      <div className="summary-detail">
        <span className="detail-icon" aria-hidden="true">
          ▦
        </span>
        <div>
          <small>Date</small>
          <strong>{dateLabel}</strong>
        </div>
      </div>
      <div className="summary-detail">
        <span className="detail-icon" aria-hidden="true">
          ◷
        </span>
        <div>
          <small>Time</small>
          <strong>{selectedSlot || "Choose a time"}</strong>
        </div>
      </div>
      <div className="summary-detail">
        <span className="detail-icon" aria-hidden="true">
          ♧
        </span>
        <div>
          <small>Visit type</small>
          <strong>Primary care · In person</strong>
        </div>
      </div>
      <button
        className="request-button"
        type="button"
        disabled={!selectedSlot || requestSent}
        onClick={onRequestAppointment}
      >
        {requestSent ? "Demo request received" : "Request appointment"}
        {!requestSent && <span aria-hidden="true">→</span>}
      </button>
      <p className="demo-notice">
        Demo only — no appointment is sent or stored.
      </p>
    </aside>
  );
}
