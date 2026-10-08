"use client";

import Link from "next/link";
import { useState } from "react";
import { api } from "../../lib/api";
import { Logo } from "../../components/Site";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      setBusy(true);
      await api("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email: email.trim() }) });
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="center-page">
      <div className="auth-card">
        <Logo />
        <h1>Reset your password</h1>
        {sent ? (
          <>
            <p className="auth-sub">If an account exists for {email}, a reset link is on its way. Check your inbox.</p>
            <Link href="/login" className="btn btn-ghost btn-block">Back to sign in</Link>
          </>
        ) : (
          <>
            <p className="auth-sub">Enter your email and we'll send you a link to choose a new password.</p>
            <form onSubmit={submit}>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" type="email" autoComplete="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>
              {error && <div className="auth-error" role="alert">{error}</div>}
              <button className="btn btn-primary btn-block" disabled={busy || !email.trim()}>
                {busy ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <p className="auth-foot"><Link href="/login" className="text-link">Back to sign in</Link></p>
          </>
        )}
      </div>
    </main>
  );
}
