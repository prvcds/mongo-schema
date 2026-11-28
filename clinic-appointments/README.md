# Clinic appointment booking view

A standalone React/Vite view for choosing a clinic appointment date and time.
The clinic, times, and availability are fictional. The appointment request is
only a UI demonstration; it is not sent to a server or saved.

## Run it

```powershell
cd clinic-appointments
npm install
npm run dev
```

Create a production bundle with `npm run build`.

## Reusable components and state ownership

- `DatePicker` owns no state: the page passes the selected date and change
  handler. This keeps date selection coordinated with availability and summary.
- `AvailabilityPanel` and its `SlotButton` render loading, empty, error, and
  available states from props. `SlotButton` also reports selection upward.
- `AppointmentSummary` renders the chosen date/time and invokes the page-owned
  request action; it does not persist patient or appointment data.
- `StatePreview` is a small demo control for inspecting each availability state.
- `ClinicHeader` is a reusable, presentational brand/header component.

`App` owns the cross-component state: selected date and time, availability
request status, preview override, retry count, and demo-request feedback. The
availability effect represents a cancellable request lifecycle; replace its
short local timer with the API call below when connecting a backend.

```text
App (owns shared state)
├── DatePicker ───────────── date selection ───────────┐
├── AvailabilityPanel ────── time selection ──────────┤
│   └── SlotButton (reused for each time)              ├── App state
├── AppointmentSummary ───── request action ──────────┤
└── StatePreview ─────────── state preview ───────────┘
```

## Example API contract

The demo intentionally makes no network requests. A production integration
could use an authenticated, patient-scoped endpoint and return only the
minimum fields needed to book:

```http
GET /api/appointments/availability?date=2026-12-01
Authorization: Bearer <session-token>
Accept: application/json
```

```json
{
  "date": "2026-12-01",
  "timezone": "America/Los_Angeles",
  "slots": [
    { "id": "slot_01", "startsAt": "2026-12-01T17:00:00Z", "durationMinutes": 20 }
  ]
}
```

Booking can submit only the selected opaque slot identifier to an authenticated
endpoint. The server must authorize the patient from the session, re-check
availability atomically, and avoid returning or logging unnecessary patient
details. In production, use HTTPS, CSRF protections as appropriate, server-side
authorization, and safe handling of tokens; never put patient data in URLs,
analytics, browser storage, or client logs. This front-end example contains no
patient identifiers, health details, credentials, or persistent storage.

## State and accessibility notes

- `loading`: an announced progress message while availability is checked.
- `empty`: explains that no times are available and encourages another date.
- `error`: gives a safe, non-sensitive message and a retry action.
- `ready`: lists selectable times with pressed state semantics.
- The state preview lets a reviewer show each of these states without a server.
- Buttons have visible keyboard focus; reduced-motion preferences are respected.

## Verification

Verified locally:

- `npm run build` — passed; Vite 6.4.6 produced the production bundle.
- `npm audit` — passed with 0 vulnerabilities.
- Browser check — the page rendered and the Available, Loading, No times, and
  Error previews rendered as expected. Date/time selection and the request
  button are interactive; the request action only shows a demo acknowledgement.

The view uses system fonts rather than a third-party font request. The date,
time, and state-preview controls work without a backend.
