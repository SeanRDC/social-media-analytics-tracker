"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/icons/Icon";
import s from "./Onboarding.module.css";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) {
      setError("Enter an email like name@example.com");
      return;
    }
    setError("");
    router.push("/onboarding/connect");
  };

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
      <button type="submit" className={s.primary}>
        Continue with email
      </button>
      <div className={s.or}>
        <span>or</span>
      </div>
      <button type="button" className={s.secondary} onClick={() => router.push("/onboarding/connect")}>
        <Icon name="globe" size={16} /> Continue with Google
      </button>
      <button type="button" className={s.secondary} onClick={() => router.push("/onboarding/connect")}>
        <Icon name="user" size={16} /> Continue with Apple
      </button>
      <p className={s.fine}>Sign-in is simulated in this prototype. No account is created.</p>
    </form>
  );
}
