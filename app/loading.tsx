export default function Loading() {
  return (
    <div className="dyo-loader" role="status" aria-live="polite" aria-label="Loading page">
      <div className="dyo-loader-card">
        <div className="dyo-loader-orbit" aria-hidden="true"><span /><span /><span /></div>
        <img src="/assets/dyo%20logo.png" alt="" className="dyo-loader-logo" />
        <p className="dyo-loader-title">DYO <span>Ibadan North Diocese</span></p>
        <div className="dyo-loader-track" aria-hidden="true"><span /></div>
        <p className="dyo-loader-caption">Preparing your page</p>
      </div>
    </div>
  );
}
