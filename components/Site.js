"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

export function useUser() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api("/auth/me")
      .then((data) => alive && setUser(data?.user || data))
      .catch(() => alive && setUser(null))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, []);

  return { user, loading };
}

export function Logo() {
  return (
    <Link href="/" className="brand" aria-label="Fades Chat home">
      <span className="brand-mark"><span>f</span></span>
      <span className="brand-text"><strong>Fades</strong><span>Chat</span></span>
    </Link>
  );
}

export function SiteNav() {
  const { user, loading } = useUser();

  return (
    <header className="site-nav">
      <div className="wrap site-nav-inner">
        <Logo />
        <nav className="site-nav-links" aria-label="Main">
          <a href="/#features">Features</a>
          <a href="/#how">How it works</a>
          <a href="/#faq">FAQ</a>
        </nav>
        <div className="site-nav-actions">
          {loading ? null : user ? (
            <Link href="/chat" className="btn btn-primary btn-sm">Open chat</Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">Sign in</Link>
              <Link href="/signup" className="btn btn-primary btn-sm">Create account</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="wrap site-footer-inner">
        <Logo />
        <nav aria-label="Footer">
          <Link href="/login">Sign in</Link>
          <Link href="/signup">Create account</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <span className="site-copy">© {new Date().getFullYear()} Fades</span>
      </div>
    </footer>
  );
}
