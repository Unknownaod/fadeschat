"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Logo, useUser } from "./Site";

function strength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

const LEVELS = ["Too short", "Weak", "Okay", "Good", "Strong"];

export default function AuthForm({ mode }) {
  const router = useRouter();
  const { user } = useUser();
  const signup = mode === "signup";

  const [form, setForm] = useState({
    displayName: "", username: "", email: "", identifier: "",
    password: "", confirm: "", terms: false,
  });
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (user) router.replace("/chat"); }, [user, router]);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    setError("");

    if (signup) {
      if (!/^[a-zA-Z0-9_.]{3,24}$/.test(form.username))
        return setError("Usernames are 3–24 characters: letters, numbers, dots and underscores.");
      if (form.password.length < 8) return setError("Use a password with at least 8 characters.");
      if (form.password !== form.confirm) return setError("Those passwords don't match.");
      if (!form.terms) return setError("Accept the Terms and Privacy Policy to continue.");
    }

    try {
      setBusy(true);
      if (signup) {
        await api("/auth/signup", {
          method: "POST",
          body: JSON.stringify({
            username: form.username.trim(),
            displayName: form.displayName.trim() || form.username.trim(),
            email: form.email.trim(),
            password: form.password,
          }),
        });
      } else {
        const id = form.identifier.trim();
        await api("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            identifier: id,
            [id.includes("@") ? "email" : "username"]: id,
            password: form.password,
          }),
        });
      }
      router.push("/chat");
    } catch (err) {
      setError(err.message || "Unable to continue. Try again.");
      setBusy(false);
    }
  }

  const score = strength(form.password);

  return (
    <main className="auth">
      <div className="auth-form-side">
        <div className="auth-card">
          <Logo />
          <h1>{signup ? "Create your account" : "Welcome back"}</h1>
          <p className="auth-sub">
            {signup ? "One Fades account is all you need to start chatting."
                    : "Sign in to pick up your conversations."}
          </p>

          <form onSubmit={submit} noValidate>
            {signup ? (
              <>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="displayName">Name</label>
                    <input id="displayName" autoComplete="name" value={form.displayName}
                      onChange={set("displayName")} placeholder="Ada Lovelace" maxLength={40} />
                  </div>
                  <div className="field">
                    <label htmlFor="username">Username</label>
                    <input id="username" autoComplete="username" value={form.username}
                      onChange={set("username")} placeholder="ada" required />
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input id="email" type="email" autoComplete="email" value={form.email}
                    onChange={set("email")} placeholder="you@example.com" required />
                </div>
              </>
            ) : (
              <div className="field">
                <label htmlFor="identifier">Username or email</label>
                <input id="identifier" autoComplete="username" value={form.identifier}
                  onChange={set("identifier")} required autoFocus />
              </div>
            )}

            <div className="field">
              <div className="field-label-row">
                <label htmlFor="password">Password</label>
                {!signup && <Link href="/forgot-password" className="text-link">Forgot password?</Link>}
              </div>
              <div className="pw-wrap">
                <input id="password" type={show ? "text" : "password"}
                  autoComplete={signup ? "new-password" : "current-password"}
                  value={form.password} onChange={set("password")} required />
                <button type="button" className="pw-toggle" onClick={() => setShow((s) => !s)}
                  aria-label={show ? "Hide password" : "Show password"}>
                  {show ? "Hide" : "Show"}
                </button>
              </div>
              {signup && form.password && (
                <div className="meter" aria-live="polite">
                  <div className="meter-bars">
                    {[1, 2, 3, 4].map((n) => <i key={n} className={score >= n ? `on s${score}` : ""} />)}
                  </div>
                  <span>{LEVELS[score]}</span>
                </div>
              )}
            </div>

            {signup && (
              <>
                <div className="field">
                  <label htmlFor="confirm">Confirm password</label>
                  <input id="confirm" type={show ? "text" : "password"} autoComplete="new-password"
                    value={form.confirm} onChange={set("confirm")} required />
                </div>
                <label className="check">
                  <input type="checkbox" checked={form.terms} onChange={set("terms")} />
                  <span>I agree to the <Link href="/terms" className="text-link">Terms</Link> and{" "}
                    <Link href="/privacy" className="text-link">Privacy Policy</Link>.</span>
                </label>
              </>
            )}

            {error && <div className="auth-error" role="alert">{error}</div>}

            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? (signup ? "Creating account…" : "Signing in…") : signup ? "Create account" : "Sign in"}
            </button>
          </form>

          <p className="auth-foot">
            {signup ? <>Already have an account? <Link href="/login" className="text-link">Sign in</Link></>
                    : <>New to Fades? <Link href="/signup" className="text-link">Create an account</Link></>}
          </p>
        </div>
      </div>

      <aside className="auth-aside" aria-hidden="true">
        <div className="mock mock-aside">
          <div className="mock-body">
            <div className="mock-msg other">Did you see the new Fades Chat?</div>
            <div className="mock-msg own">Just signed up. It's fast.</div>
            <div className="mock-msg other">Start a group, I'll add everyone.</div>
          </div>
        </div>
        <p>Direct messages, group chats and read receipts, all on your Fades account.</p>
      </aside>
    </main>
  );
}
