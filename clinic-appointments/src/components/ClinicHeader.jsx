export default function ClinicHeader() {
  return (
    <header className="topbar">
      <a className="brand" href="#" aria-label="Harborview Clinic home">
        <span className="brand-mark" aria-hidden="true">
          +
        </span>
        <span>
          <strong>Harborview</strong>
          <small>FAMILY CLINIC</small>
        </span>
      </a>
      <div className="secure-label">
        <span className="lock-icon" aria-hidden="true">
          ◈
        </span>
        Secure patient portal
      </div>
    </header>
  );
}
