"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { resizeToSquare } from "@/lib/resize-image";
import s from "./AvatarEditor.module.css";

type Result = { error: string } | void | undefined;

interface Props {
  name: string;
  src: string | null;
  onUpload: (form: FormData) => Promise<Result>;
  onRemove: () => Promise<Result>;
  /** Injected in tests; the browser canvas resize otherwise. */
  resize?: (file: File) => Promise<Blob>;
}

/** The profile photo on Settings: hover, focus or tap it to change it. */
export function AvatarEditor({ name, src, onUpload, onRemove, resize = resizeToSquare }: Props) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shown = preview ?? src;

  const choose = (file: File | undefined) => {
    if (!file) return;
    setError(null);
    start(async () => {
      try {
        const blob = await resize(file);
        const form = new FormData();
        form.set("photo", blob, "photo");
        const res = await onUpload(form);
        if (res?.error) return setError(res.error);
        router.refresh();
        // show the new photo right away while the page refreshes (not every environment can preview)
        if (typeof URL.createObjectURL === "function") setPreview(URL.createObjectURL(blob));
      } catch {
        setError("Couldn't read that photo. Try a JPG or PNG.");
      }
    });
  };

  const remove = () => {
    setError(null);
    start(async () => {
      const res = await onRemove();
      if (res?.error) return setError(res.error);
      setPreview(null);
      router.refresh();
    });
  };

  return (
    <div className={s.wrap}>
      <label className={s.pick} data-busy={pending}>
        <Avatar size={72} src={shown} label={name} />
        <span className={s.overlay} aria-hidden="true">
          <Icon name="camera" size={20} />
          <span>{pending ? "Saving…" : "Change photo"}</span>
        </span>
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic,image/heif"
          className={s.input}
          aria-label="Change photo"
          disabled={pending}
          onChange={(e) => {
            choose(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </label>
      {(src || preview) && (
        <button type="button" className={s.remove} onClick={remove} disabled={pending}>
          Remove photo
        </button>
      )}
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
