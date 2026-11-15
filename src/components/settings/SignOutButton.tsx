"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { authClient } from "@/lib/auth-client";
import s from "./Settings.module.css";

export function SignOutButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={s.ghost}
      disabled={busy}
      aria-busy={busy}
      onClick={async () => {
        setBusy(true);
        await authClient.signOut();
        router.replace("/sign-in");
        router.refresh();
      }}
    >
      <Icon name="logout" size={15} /> {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
