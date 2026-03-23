"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import PixelLogo from "./pixel-logo";

export default function Nav() {
  const [user, setUser] = useState<User | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [email, setEmail] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setAuthMessage(error.message);
    } else {
      setAuthMessage("Check your email for the magic link!");
      setEmail("");
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setShowAuth(false);
  };

  return (
    <nav className="sticky top-0 z-50 bg-bg border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Left: Logo + Title */}
        <Link href="/" className="flex items-center gap-3 no-underline">
          <PixelLogo size={32} />
          <span className="font-pixel-xs text-crab-red hidden sm:inline">
            COUNCIL OF eCLAWMMERCE
          </span>
        </Link>

        {/* Desktop Right */}
        <div className="hidden md:flex items-center gap-4">
          <Link href="/submit" className="btn-ghost text-xs">
            SUBMIT
          </Link>

          {user ? (
            <div className="flex items-center gap-3">
              <span className="text-text-secondary text-xs font-mono truncate max-w-[160px]">
                {user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-text-secondary text-xs font-mono hover:text-crab-red transition-colors"
              >
                SIGN OUT
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAuth(!showAuth)}
              className="text-text-secondary text-xs font-mono hover:text-crab-red transition-colors"
            >
              SIGN IN
            </button>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-text-primary text-xl"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-surface border-t border-border px-4 py-3 flex flex-col gap-3">
          <Link
            href="/submit"
            className="btn-ghost text-xs text-center"
            onClick={() => setMenuOpen(false)}
          >
            SUBMIT
          </Link>
          {user ? (
            <>
              <span className="text-text-secondary text-xs font-mono truncate">
                {user.email}
              </span>
              <button
                onClick={() => {
                  handleSignOut();
                  setMenuOpen(false);
                }}
                className="text-text-secondary text-xs font-mono hover:text-crab-red"
              >
                SIGN OUT
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                setShowAuth(!showAuth);
                setMenuOpen(false);
              }}
              className="text-text-secondary text-xs font-mono hover:text-crab-red"
            >
              SIGN IN
            </button>
          )}
        </div>
      )}

      {/* Auth dropdown */}
      {showAuth && !user && (
        <div className="absolute top-14 right-4 bg-surface pixel-border p-4 z-50 w-80">
          <p className="text-xs font-mono text-text-secondary mb-3">
            Sign in with magic link (no password)
          </p>
          <form onSubmit={handleSignIn} className="flex flex-col gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="bg-bg pixel-border px-3 py-2 text-sm font-mono text-text-primary
                focus:outline-none focus:border-crab-red"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary text-xs disabled:opacity-50"
            >
              {loading ? (
                <span className="spinner" />
              ) : (
                "SEND MAGIC LINK"
              )}
            </button>
          </form>
          {authMessage && (
            <p className="text-xs font-mono mt-2 text-success">
              {authMessage}
            </p>
          )}
        </div>
      )}
    </nav>
  );
}
