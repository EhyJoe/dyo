import Link from "next/link";
import Navbar from "../src/components/Navbar";
import SiteFooter from "../src/components/Sitefooter";

export default function NotFound() {
  return (
    <div className="public-widget-page">
      <Navbar />
      <main className="system-state-content">
        <h1>That page does not exist</h1>
        <Link href="/">Back to the home page</Link>
      </main>
      <SiteFooter />
    </div>
  );
}
