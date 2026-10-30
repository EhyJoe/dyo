import { Link } from "@/lib/next-router";

/** One footer, used by every public page. */
export default function Sitefooter() {
  return (
    <footer className="home-footer">
      <div className="home-footer-main">
        <Link to="/" className="home-footer-brand">
          <img className="home-footer-mark" src="/assets/dyo%20logo.png" alt="DYO logo" />
          <span className="home-footer-brand-copy">
            <span className="home-footer-kicker">Ibadan North Diocese</span>
            <span className="home-footer-title">Diocesan Youth Organization</span>
            <span className="home-footer-tagline">Growing in faith. Serving together. Sharing hope.</span>
          </span>
        </Link>
        <div className="home-footer-connect">
          <h3>Stay connected</h3>
          <p>Follow the life and work of young people across our diocese.</p>
          <div className="home-footer-socials" aria-label="Social media">
            <a href="https://www.instagram.com/" target="_blank" rel="noreferrer" aria-label="Instagram">
              <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle className="home-social-dot" cx="17.5" cy="6.5" r=".8"/></svg>
            </a>
            <a href="https://www.facebook.com/" target="_blank" rel="noreferrer" aria-label="Facebook">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 21v-8h3l.5-3H14V8c0-.9.3-1.5 1.6-1.5H18V3.8c-.8-.1-1.7-.2-2.6-.2-2.7 0-4.4 1.6-4.4 4.5v1.9H8v3h3v8z"/></svg>
            </a>
            <a href="https://www.youtube.com/" target="_blank" rel="noreferrer" aria-label="YouTube">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 7.2a2.7 2.7 0 0 0-1.9-1.9C17.4 4.8 12 4.8 12 4.8s-5.4 0-7.1.5A2.7 2.7 0 0 0 3 7.2 28 28 0 0 0 2.5 12a28 28 0 0 0 .5 4.8 2.7 2.7 0 0 0 1.9 1.9c1.7.5 7.1.5 7.1.5s5.4 0 7.1-.5a2.7 2.7 0 0 0 1.9-1.9 28 28 0 0 0 .5-4.8ZM10 15.2V8.8l5.5 3.2z"/></svg>
            </a>
          </div>
        </div>
      </div>
      <div className="home-footer-bottom">
        <p>Â© {new Date().getFullYear()} Diocesan Youth Organization. All rights reserved.</p>
      </div>
      </footer>
  );
}

