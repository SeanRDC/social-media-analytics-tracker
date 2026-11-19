"use client";

import { useActionState, useState, type ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import legal from "@/components/legal/Legal.module.css";
import { SegmentedControl } from "@/components/shell/SegmentedControl";
import { Checkbox } from "@/components/ui/Checkbox";
import s from "./Onboarding.module.css";

type Doc = "terms" | "privacy";

const DOCS = [
  { value: "terms", label: "Terms of Service" },
  { value: "privacy", label: "Privacy Policy" },
] as const;

interface Props {
  terms: ReactNode;
  privacy: ReactNode;
  /** Server Action: records the agreement and redirects, or returns an error. */
  onAgree: (prev: { error: string } | null, form: FormData) => Promise<{ error: string } | null>;
}

/** The full terms and privacy policy, a box to tick, and Continue, which stays off until it is ticked. */
export function AgreementForm({ terms, privacy, onAgree }: Props) {
  const [doc, setDoc] = useState<Doc>("terms");
  const [agreed, setAgreed] = useState(false);
  const [state, action, pending] = useActionState(onAgree, null);

  return (
    <form action={action} className={s.agree}>
      <SegmentedControl label="Document" options={DOCS} value={doc} onChange={setDoc} className={s.docTabs} />
      {/* focusable so the text can be scrolled with the keyboard */}
      <div className={`${s.docPanel} ${legal.prose}`} tabIndex={0} role="region" aria-label={doc === "terms" ? "Terms of Service" : "Privacy Policy"} key={doc}>
        {doc === "terms" ? terms : privacy}
      </div>
      <p className={s.docLinks}>
        Open in a new tab:{" "}
        <a href="/terms" target="_blank" rel="noreferrer">
          Terms of Service <Icon name="ext" size={12} />
        </a>{" "}
        ·{" "}
        <a href="/privacy" target="_blank" rel="noreferrer">
          Privacy Policy <Icon name="ext" size={12} />
        </a>
      </p>

      <Checkbox name="agree" checked={agreed} onChange={setAgreed}>
        I have read and agree to the Terms of Service and the Privacy Policy.
      </Checkbox>

      {state?.error && (
        <p className={s.error} role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className={s.primary} disabled={!agreed || pending} aria-busy={pending}>
        {pending ? "Saving…" : "Agree and continue"}
      </button>
    </form>
  );
}
