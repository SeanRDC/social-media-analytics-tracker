"use client";

import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { useAnchoredMenu } from "@/hooks/useAnchoredMenu";
import { useDismiss } from "@/hooks/useDismiss";
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

/**
 * The profile photo on Settings. Tap the photo to change it. The small camera
 * badge on its corner opens the file picker, or, once there is a photo, a short
 * menu to upload a new one or remove it.
 */
export function AvatarEditor({ name, src, onUpload, onRemove, resize = resizeToSquare }: Props) {
  const router = useRouter();
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const shown = preview ?? src;
  const hasPhoto = Boolean(src || preview);
  const [menu, setMenu] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const badge = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const menuId = useId();
  // portalled and anchored, so the cards below can't cover it
  useAnchoredMenu(badge, list, menu, "start");
  useDismiss(menu, [badge, list], (reason) => {
    setMenu(false);
    if (reason === "escape") badge.current?.focus();
  });

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
    setMenu(false);
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
      <div className={s.photo}>
        <label className={s.pick} data-busy={pending}>
          <Avatar size={72} src={shown} label={name} />
          <span className={s.overlay} aria-hidden="true">
            <Icon name="camera" size={20} />
            <span>{pending ? "Saving…" : "Change photo"}</span>
          </span>
          <input
            ref={file}
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
        <button
          ref={badge}
          type="button"
          className={s.badge}
          aria-label={hasPhoto ? "Photo options" : "Add a photo"}
          aria-haspopup={hasPhoto ? "menu" : undefined}
          aria-expanded={hasPhoto ? menu : undefined}
          aria-controls={menu ? menuId : undefined}
          disabled={pending}
          onClick={() => (hasPhoto ? setMenu((m) => !m) : file.current?.click())}
        >
          <Icon name="camera" size={14} strokeWidth={2} />
        </button>
        {menu &&
          createPortal(
            <div ref={list} id={menuId} role="menu" aria-label="Photo options" className={s.menu}>
              <button
                type="button"
                role="menuitem"
                className={s.item}
                onClick={() => {
                  setMenu(false);
                  file.current?.click();
                }}
              >
                Upload new photo
              </button>
              <button type="button" role="menuitem" className={`${s.item} ${s.danger}`} onClick={remove}>
                Remove photo
              </button>
            </div>,
            document.body,
          )}
      </div>
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
