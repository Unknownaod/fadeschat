"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "../../lib/api";
import { Logo, useUser } from "../../components/Site";

export default function Settings() {
  const router = useRouter();
  const { user, loading } = useUser();

  useEffect(() => { if (!loading && !user) router.replace("/login"); }, [loading, user, router]);

  async function logout() {
    try { await api("/auth/logout", { method: "POST", body: JSON.stringify({}) }); } catch {}
    router.replace("/");
  }

  if (loading || !user) return <main className="center-page"><div className="loading-text">Loading…</div></main>;

  const name = user.displayName || user.username;

  return (
    <main className="center-page">
      <div className="auth-card">
        <Logo />
        <h1>Account</h1>
        <div className="account-box">
          <div className="avatar">{name.slice(0, 2).toUpperCase()}</div>
          <div><strong>{name}</strong><span>@{user.username}</span>{user.email && <span>{user.email}</span>}</div>
        </div>
        <Link href="/chat" className="btn btn-primary btn-block">Back to chat</Link>
        <button type="button" className="btn btn-ghost btn-block" onClick={logout}>Sign out</button>
      </div>
    </main>
  );
}
