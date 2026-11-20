"use client";

import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icons/Icon";
import { authClient } from "@/lib/auth-client";
import type { SocialProvider } from "@/lib/auth-providers";
import s from "./Onboarding.module.css";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LABEL: Record<SocialProvider, string> = { google: "Google", apple: "Apple" };
const ICON = { google: "globe", apple: "user" } as const;

/**
 * Only same-site paths are allowed as a post-sign-in destination. Browsers read
 * "/\evil.com" like "//evil.com", so backslashes and control characters are refused too.
 */
export function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/overview";
  const unsafe = (c: string) => c === "\\" || c.charCodeAt(0) < 0x20 || c.charCodeAt(0) === 0x7f;
  if ([...raw].some(unsafe)) return "/overview";
  return raw;
}

export function SignInForm({ providers, reviewer = false }: { providers: SocialProvider[]; reviewer?: boolean }) {
  const search = useSearchParams();
  const next = safeNext(search.get("next"));
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const address = email.trim();
    if (!EMAIL.test(address)) {
      setError("Enter an email like name@example.com");
      return;
    }
    setError("");
    setSending(true);
    const { error: err } = await authClient.signIn.magicLink({ email: address, callbackURL: next, newUserCallbackURL: "/welcome" });
    setSending(false);
    if (err) {
      setError(err.message ?? "We couldn't send the link. Try again in a moment.");
      return;
    }
    setSentTo(address);
    if (process.env.NODE_ENV === "development") {
      fetch(`/api/dev/last-link?email=${encodeURIComponent(address)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { url: string | null } | null) => setDevLink(d?.url ?? null))
        .catch(() => {});
    }
  };

  const social = (provider: SocialProvider) => {
    void authClient.signIn.social({ provider, callbackURL: next, newUserCallbackURL: "/welcome" });
  };

  if (sentTo) {
    return (
      <div className={s.form} aria-live="polite">
        <span className={s.check} style={{ width: 44, height: 44 }} aria-hidden="true">
          <Icon name="mail" size={20} strokeWidth={1.8} />
        </span>
        <h2 className={s.h1} style={{ fontSize: 22 }}>
          Check your email
        </h2>
        <p className={s.sub}>
          We sent a sign-in link to <b style={{ color: "var(--tx)" }}>{sentTo}</b>. It works once and expires in 10 minutes.
        </p>
        {devLink && (
          <a href={devLink} className={s.primary}>
            Development: open the sign-in link
          </a>
        )}
        <button
          type="button"
          className={s.secondary}
          onClick={() => {
            setSentTo(null);
            setDevLink(null);
          }}
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form className={s.form} onSubmit={submit} noValidate>
      <label className={s.field}>
        <span>Email</span>
        <input
          type="email"
          inputMode="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "email-error" : undefined}
          placeholder="you@studio.com"
        />
      </label>
      {error && (
        <p id="email-error" className={s.error} role="alert">
          <Icon name="alert" size={14} /> {error}
        </p>
      )}
      <button type="submit" className={s.primary} disabled={sending} aria-busy={sending}>
        {sending ? "Sending…" : "Email me a sign-in link"}
      </button>
      {providers.length > 0 && (
        <>
          <div className={s.or}>
            <span>or</span>
          </div>
          {providers.map((p) => (
            <button key={p} type="button" className={s.secondary} onClick={() => social(p)}>
              <Icon name={ICON[p]} size={16} /> Continue with {LABEL[p]}
            </button>
          ))}
        </>
      )}
      <p className={s.fine}>No password needed. New here? The link creates your account.</p>
      {reviewer && <ReviewerSignIn next={next} />}
    </form>
  );
}

/**
 * Password sign-in for platform app reviewers (Meta, TikTok, LinkedIn, Google),
 * who can't receive our sign-in emails. Collapsed so everyone else ignores it.
 * Its own <form> can't nest inside the email form, so fields submit by button.
 */
function ReviewerSignIn({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const signIn = async () => {
    setError("");
    setBusy(true);
    const { error: err } = await authClient.signIn.email({ email: email.trim(), password, callbackURL: next });
    setBusy(false);
    if (err) setError(err.status === 429 ? "Too many attempts. Try again in 10 minutes." : "That email and password don't match a reviewer account.");
  };

  return (
    <details className={s.reviewer}>
      <summary>App reviewer sign-in</summary>
      <div className={s.reviewerBody}>
        <p className={s.fine}>For platform app reviewers using the test account we provided.</p>
        <label className={s.field}>
          <span>Reviewer email</span>
          <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className={s.field}>
          <span>Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void signIn();
              }
            }}
            aria-invalid={!!error}
            aria-describedby={error ? "reviewer-error" : undefined}
          />
        </label>
        {error && (
          <p id="reviewer-error" className={s.error} role="alert">
            <Icon name="alert" size={14} /> {error}
          </p>
        )}
        <button type="button" className={s.secondary} disabled={busy || !email || !password} aria-busy={busy} onClick={() => void signIn()}>
          {busy ? "Signing in…" : "Sign in as reviewer"}
        </button>
      </div>
    </details>
  );
}
