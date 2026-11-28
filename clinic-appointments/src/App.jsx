import { useEffect, useState } from "react";
import AppointmentSummary from "./components/AppointmentSummary.jsx";
import AvailabilityPanel from "./components/AvailabilityPanel.jsx";
import ClinicHeader from "./components/ClinicHeader.jsx";
import DatePicker from "./components/DatePicker.jsx";
import StatePreview from "./components/StatePreview.jsx";
import { formatLongDate, getUpcomingDates } from "./dateUtils.js";

const DATES = getUpcomingDates();

export default function App() {
  const [selectedDate, setSelectedDate] = useState(DATES[0].value);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [availabilityStatus, setAvailabilityStatus] = useState("loading");
  const [previewState, setPreviewState] = useState(null);
  const [requestSent, setRequestSent] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    setAvailabilityStatus("loading");
    const timeoutId = window.setTimeout(() => {
      if (active) setAvailabilityStatus("ready");
    }, 550);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [selectedDate, retryCount]);

  function chooseDate(date) {
    setSelectedDate(date);
    setSelectedSlot("");
    setRequestSent(false);
    setPreviewState(null);
  }

  function preview(state) {
    setPreviewState(state);
    setSelectedSlot("");
    setRequestSent(false);
  }

  function requestAppointment() {
    setRequestSent(true);
  }

  const visibleStatus = previewState || availabilityStatus;

  return (
    <div className="app-shell">
      <ClinicHeader />
      <main className="page-content">
        <div className="breadcrumb">
          <span>Patient portal</span>
          <span aria-hidden="true">/</span>
          <strong>Appointments</strong>
        </div>

        <div className="page-heading">
          <div>
            <span className="eyebrow">CARE THAT FITS YOUR DAY</span>
            <h1>Book an appointment</h1>
            <p>Choose a time for your next visit with our care team.</p>
          </div>
          <div className="doctor-badge" aria-label="Primary care appointment">
            <span aria-hidden="true">✳</span>
            <span>
              <strong>Primary care</strong>
              <small>Harborview Clinic</small>
            </span>
          </div>
        </div>

        <div className="booking-layout">
          <div className="booking-card">
            <DatePicker
              dates={DATES}
              selectedDate={selectedDate}
              onSelectDate={chooseDate}
            />
            <div className="section-divider" />
            <AvailabilityPanel
              status={visibleStatus}
              selectedSlot={selectedSlot}
              onSelectSlot={(slot) => {
                setSelectedSlot(slot);
                setRequestSent(false);
              }}
              onRetry={() => {
                setPreviewState(null);
                setRetryCount((count) => count + 1);
              }}
            />
            <div className="privacy-note">
              <span aria-hidden="true">⌑</span>
              <p>
                Your health information stays private. Only share details
                through the secure patient portal.
              </p>
            </div>
          </div>

          <AppointmentSummary
            dateLabel={formatLongDate(selectedDate)}
            selectedSlot={selectedSlot}
            onRequestAppointment={requestAppointment}
            requestSent={requestSent}
          />
        </div>

        <div className="demo-tools">
          <StatePreview value={visibleStatus} onChange={preview} />
          <span>Interactive state preview · fictional availability</span>
        </div>

        <footer className="page-footer">
          <span>Need help? Call (555) 010-2040</span>
          <span>Privacy · Accessibility</span>
        </footer>
      </main>
    </div>
  );
}
