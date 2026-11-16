"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import { Icon } from "@/components/icons/Icon";
import { PlatformPill } from "@/components/ui/PlatformPill";
import type { Post } from "@/lib/data/types";
import { formatDate, formatDuration, formatNumber, formatPercent } from "@/lib/format";
import { PLATFORM_NAMES } from "@/lib/platforms";
import s from "./PostSheet.module.css";
import { PostThumb } from "@/components/ui/PostThumb";

const KIND_LABEL: Record<Post["kind"], string> = { video: "Video", short: "Short", reel: "Reel", post: "Post" };

interface Props {
  post: Post | null;
  onClose: () => void;
}

/** Post details in a native modal dialog: centred on desktop, a draggable bottom sheet on phones. */
export function PostSheet({ post, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  // keep the last post on screen while the sheet animates closed
  const [shown, setShown] = useState<Post | null>(post);
  if (post && post !== shown) setShown(post);
  const [inReport, setInReport] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<"idle" | "ok" | "fail">("idle");
  const drag = useRef<{ y: number; dy: number } | null>(null);

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (post && !d.open) {
      delete d.dataset.closing;
      d.showModal();
      return;
    }
    if (!post && d.open) {
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      d.dataset.closing = "true";
      const t = window.setTimeout(() => {
        d.close();
        delete d.dataset.closing;
        if (sheet.current) sheet.current.style.transform = "";
      }, reduce ? 0 : 180);
      return () => window.clearTimeout(t);
    }
  }, [post]);

  // the page stays mounted when navigating away; make sure the modal never lingers
  useEffect(() => () => dialog.current?.close(), []);

  useEffect(() => {
    if (copied === "idle") return;
    const t = window.setTimeout(() => setCopied("idle"), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const copy = () => {
    navigator.clipboard
      ?.writeText(window.location.href)
      .then(() => setCopied("ok"))
      .catch(() => setCopied("fail"));
  };

  const onDown = (e: PointerEvent) => {
    drag.current = { y: e.clientY, dy: 0 };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: PointerEvent) => {
    if (!drag.current || !sheet.current) return;
    drag.current.dy = Math.max(0, e.clientY - drag.current.y);
    sheet.current.style.transform = `translateY(${drag.current.dy}px)`;
  };
  const onUp = () => {
    if (!drag.current || !sheet.current) return;
    const far = drag.current.dy > 110;
    drag.current = null;
    if (far) onClose();
    else sheet.current.style.transform = "";
  };

  const p = shown;
  const added = p ? !!inReport[p.id] : false;

  return (
    <dialog
      ref={dialog}
      className={s.dialog}
      aria-labelledby="post-sheet-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {p && (
        <div ref={sheet} className={`${s.sheet} rim`}>
          <div className={s.grab} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-hidden="true">
            <span />
          </div>
          <button type="button" className={s.close} onClick={onClose} aria-label="Close">
            <Icon name="close" size={16} />
          </button>

          <div className={s.media}>
            <PostThumb post={p} className={s.cover} />
            <span className={s.kind}>{KIND_LABEL[p.kind]}</span>
          </div>

          <div className={s.meta}>
            <PlatformPill id={p.platform} />
            <span className="muted">{formatDate(p.publishedAt)}</span>
          </div>
          <h2 id="post-sheet-title" className={s.title}>
            {p.title}
          </h2>

          <dl className={s.stats}>
            <div>
              <dt>
                <Icon name="eye" size={14} /> Views
              </dt>
              <dd>{formatNumber(p.views)}</dd>
            </div>
            <div>
              <dt>
                <Icon name="sparkle" size={14} /> Engagement
              </dt>
              <dd>{formatPercent(p.engagement)}</dd>
            </div>
            <div>
              <dt>
                <Icon name="clock" size={14} /> Avg. watch
              </dt>
              <dd>{formatDuration(p.avgWatchSeconds)}</dd>
            </div>
            <div>
              <dt>
                <Icon name="heart" size={14} /> Likes
              </dt>
              <dd>{formatNumber(p.likes)}</dd>
            </div>
            <div>
              <dt>
                <Icon name="comment" size={14} /> Comments
              </dt>
              <dd>{formatNumber(p.comments)}</dd>
            </div>
            <div>
              <dt>
                <Icon name="share" size={14} /> Shares
              </dt>
              <dd>{formatNumber(p.shares)}</dd>
            </div>
          </dl>

          {p.insight && (
            <p className={s.insight}>
              <Icon name="sparkle" size={16} />
              <span>{p.insight}</span>
            </p>
          )}

          <div className={s.actions}>
            <button type="button" className={`${s.primary} ${added ? s.added : ""}`} aria-pressed={added} onClick={() => setInReport((r) => ({ ...r, [p.id]: !r[p.id] }))}>
              <Icon name={added ? "check" : "plus"} size={15} strokeWidth={1.8} />
              {added ? "Added to report" : "Add to report"}
            </button>
            <button type="button" className={s.secondary} onClick={copy}>
              <Icon name={copied === "ok" ? "check" : "link"} size={15} />
              {copied === "ok" ? "Link copied" : copied === "fail" ? "Couldn't copy" : "Copy link"}
            </button>
            {p.permalink ? (
              <a href={p.permalink} target="_blank" rel="noopener noreferrer" className={s.secondary}>
                <Icon name="arrow" size={15} />
                Open on {PLATFORM_NAMES[p.platform]}
              </a>
            ) : (
              <span className={s.note}>This is a sample post, so there is nothing to open on {PLATFORM_NAMES[p.platform]}.</span>
            )}
          </div>
        </div>
      )}
    </dialog>
  );
}
