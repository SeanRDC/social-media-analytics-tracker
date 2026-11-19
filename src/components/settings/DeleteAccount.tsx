"use client";

import { useState, useTransition } from "react";
import s from "./Settings.module.css";

interface Props {
  email: string;
  /** Server Action: returns an error, or redirects to sign-in once everything is deleted. */
  onDelete: (confirmEmail: string) => Promise<{ error: string } | void>;
}

export function DeleteAccount({ email, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  if (!open) {
    return (
      <button type="button" className={s.danger} onClick={() => setOpen(true)}>
        Delete account
      </button>
    );
  }

  return (
    <form
      // the app explains a mismatch itself instead of the browser's own popup
      noValidate
      className={s.deleteForm}
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const res = await onDelete(typed);
          if (res?.error) setError(res.error);
        });
      }}
    >
      <p>
        This disconnects every platform, asks each one to revoke our access, and permanently deletes your account, numbers, reports and alerts. It can&apos;t be undone.
      </p>
      <label className={s.deleteField}>
        <span>
          Type <b>{email}</b> to confirm
        </span>
        <input type="email" autoComplete="off" value={typed} onChange={(e) => setTyped(e.target.value)} aria-invalid={Boolean(error)} />
      </label>
      {error && (
        <p className={s.err} role="alert">
          {error}
        </p>
      )}
      <span className={s.confirm}>
        <button type="submit" className={s.danger} disabled={pending || !typed.trim()}>
          {pending ? "Deleting…" : "Delete everything"}
        </button>
        <button type="button" className={s.ghost} onClick={() => setOpen(false)} disabled={pending}>
          Keep my account
        </button>
      </span>
    </form>
  );
}
