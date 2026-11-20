"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import s from "./Settings.module.css";

interface Props {
  name: string;
  /** Server Action that saves the new name, or explains why it couldn't. */
  onSave: (name: string) => Promise<{ error: string } | void>;
}

/** The person's name in Settings, with an inline way to change it. */
export function ProfileName({ name, onSave }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const save = (e: FormEvent) => {
    e.preventDefault();
    setError("");
    start(async () => {
      const result = await onSave(value).catch(() => ({ error: "Couldn't save. Please try again." }));
      if (result?.error) return setError(result.error);
      setEditing(false);
      router.refresh();
    });
  };

  if (!editing) {
    return (
      <span className={s.nameRow}>
        <b>{name}</b>
        <button
          type="button"
          className={s.nameEdit}
          onClick={() => {
            setValue(name);
            setEditing(true);
          }}
        >
          Edit name
        </button>
      </span>
    );
  }

  return (
    <form className={s.nameForm} onSubmit={save}>
      <label className="sr-only" htmlFor="profile-name">
        Your name
      </label>
      <input
        id="profile-name"
        className={s.nameInput}
        value={value}
        maxLength={60}
        autoComplete="name"
        autoFocus
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === "Escape" && setEditing(false)}
        aria-invalid={!!error}
        aria-describedby={error ? "profile-name-error" : undefined}
      />
      <button type="submit" className={s.nameSave} disabled={pending} aria-busy={pending}>
        {pending ? "Saving…" : "Save"}
      </button>
      <button type="button" className={s.nameEdit} onClick={() => setEditing(false)}>
        Cancel
      </button>
      {error && (
        <small id="profile-name-error" className={s.nameError} role="alert">
          {error}
        </small>
      )}
    </form>
  );
}
