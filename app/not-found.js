import Link from "next/link";
import { Logo } from "../components/Site";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <main className="center-page">
      <div className="auth-card">
        <Logo />
        <h1>Page not found</h1>
        <p className="auth-sub">That page doesn't exist or has moved.</p>
        <Link href="/" className="btn btn-primary btn-block">Go home</Link>
      </div>
    </main>
  );
}
