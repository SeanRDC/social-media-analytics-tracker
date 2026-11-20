"use client";

import { useActionState, useCallback, useRef, useState, type ReactNode, type UIEvent } from "react";
import { Icon } from "@/components/icons/Icon";
import legal from "@/components/legal/Legal.module.css";
import { SegmentedControl } from "@/components/shell/SegmentedControl";
import { Checkbox } from "@/components/ui/Checkbox";
import s from "./Onboarding.module.css";

type Doc = "terms" | "privacy";

const LABEL: Record<Doc, string> = { terms: "Terms of Service", privacy: "Privacy Policy" };

/** How close to the bottom counts as "read to the end" (rounding and the panel's padding). */
const END_SLACK_PX = 24;
/** Pause at the end of the Terms before the Privacy Policy takes its place. */
const SWITCH_DELAY_MS = 700;

interface Props {
  terms: ReactNode;
  privacy: ReactNode;
  /** Server Action: records the agreement and redirects, or returns an error. */
  onAgree: (prev: { error: string } | null, form: FormData) => Promise<{ error: string } | null>;
}

const atEnd = (el: HTMLElement) => el.scrollTop + el.clientHeight >= el.scrollHeight - END_SLACK_PX;

/**
 * The full terms and privacy policy, a box to tick, and Continue. The box only
 * unlocks once both documents have been scrolled to the end: reaching the end
 * of the Terms moves on to the Privacy Policy by itself.
 */
export function AgreementForm({ terms, privacy, onAgree }: Props) {
  const [doc, setDoc] = useState<Doc>("terms");
  const [read, setRead] = useState<Record<Doc, boolean>>({ terms: false, privacy: false });
  const [agreed, setAgreed] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [state, action, pending] = useActionState(onAgree, null);
  const switchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bothRead = read.terms && read.privacy;

  // mirrors `read` so scroll handlers can check it without stale closures
  const readRef = useRef<Record<Doc, boolean>>({ terms: false, privacy: false });

  const markRead = useCallback((d: Doc) => {
    if (readRef.current[d]) return;
    const next = { ...readRef.current, [d]: true };
    readRef.current = next;
    setRead(next);
    if (d === "terms" && !next.privacy) {
      setAnnounce("You reached the end of the Terms of Service. Showing the Privacy Policy next.");
      if (switchTimer.current) clearTimeout(switchTimer.current);
      switchTimer.current = setTimeout(() => setDoc("privacy"), SWITCH_DELAY_MS);
    } else if (next.terms && next.privacy) {
      setAnnounce("You've read both documents. You can now tick the box to agree.");
    }
  }, []);

  const onScroll = (e: UIEvent<HTMLDivElement>) => {
    if (atEnd(e.currentTarget)) markRead(doc);
  };

  // a document short enough to fit without scrolling counts as read once shown
  const measure = useCallback(
    (el: HTMLDivElement | null) => {
      if (!el) return;
      requestAnimationFrame(() => {
        if (el.isConnected && el.scrollHeight <= el.clientHeight + END_SLACK_PX) markRead(el.dataset.doc as Doc);
      });
    },
    [markRead],
  );

  const pick = (d: Doc) => {
    if (switchTimer.current) clearTimeout(switchTimer.current);
    setDoc(d);
  };

  const options = (Object.keys(LABEL) as Doc[]).map((d) => ({ value: d, label: read[d] ? `${LABEL[d]} ✓` : LABEL[d] }));
  const hint = bothRead
    ? null
    : !read.terms
      ? "Scroll to the end of the Terms of Service, then the Privacy Policy, to continue."
      : "Now scroll to the end of the Privacy Policy to continue.";

  return (
    <form action={action} className={s.agree}>
      <SegmentedControl label="Document" options={options} value={doc} onChange={pick} className={s.docTabs} />
      {/* focusable so the text can be scrolled with the keyboard */}
      <div
        ref={measure}
        data-doc={doc}
        className={`${s.docPanel} ${legal.prose}`}
        tabIndex={0}
        role="region"
        aria-label={LABEL[doc]}
        onScroll={onScroll}
        key={doc}
      >
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

      <Checkbox name="agree" checked={agreed} onChange={setAgreed} disabled={!bothRead}>
        I have read and agree to the Terms of Service and the Privacy Policy.
      </Checkbox>
      {hint && (
        <p className={s.readHint} id="read-hint">
          <Icon name="down" size={14} /> {hint}
        </p>
      )}
      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {state?.error && (
        <p className={s.error} role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className={s.primary} disabled={!agreed || !bothRead || pending} aria-busy={pending}>
        {pending ? "Saving…" : "Agree and continue"}
      </button>
    </form>
  );
}
