"use client";

import Link from "next/link";
import { useId, useState, type CSSProperties } from "react";
import { Sparkline } from "@/components/charts/Sparkline";
import { Icon } from "@/components/icons/Icon";
import { CountUp } from "@/components/motion/CountUp";
import { useRange } from "@/components/shell/RangeProvider";
import { useReorder } from "@/hooks/useReorder";
import { PLATFORM_ORDER, type Platform, type PlatformId } from "@/lib/data/types";
import { formatCompact, formatPercent, formatSigned, NO_DATA, orNoData } from "@/lib/format";
import s from "./Platforms.module.css";

interface Props {
  /** In the person's saved order. */
  platforms: Platform[];
  /** Saves a new order to the person's account; resolves with the order as stored. */
  onSaveOrder?: (order: PlatformId[]) => Promise<PlatformId[]>;
}

/**
 * One card per platform. The person can arrange them: drag (press and hold on
 * touch screens), or use each card's move button with the keyboard. The order
 * is saved to their account.
 */
export function PlatformCards({ platforms, onSaveOrder }: Props) {
  const { range } = useRange();
  const hintId = useId();
  const [saveFailed, setSaveFailed] = useState<PlatformId[] | null>(null);
  const byId = new Map(platforms.map((p) => [p.id, p]));

  const save = (order: PlatformId[]) => {
    if (!onSaveOrder) return;
    setSaveFailed(null);
    onSaveOrder(order).catch(() => setSaveFailed(order));
  };
  const { order, list, dragging, held, announcement, registerItem, registerHandle, pointerDown, clickCapture, handleKeyDown, handleBlur, reorderTo } = useReorder(
    platforms.map((p) => p.id),
    { onCommit: save, nameOf: (id) => byId.get(id)?.name ?? id },
  );
  const defaultOrder = PLATFORM_ORDER.filter((id) => byId.has(id));
  const isDefault = order.join() === defaultOrder.join();

  /** The grab handle: also how keyboard and screen-reader users move a card. */
  const handle = (p: Platform) => (
    <button
      type="button"
      ref={registerHandle(p.id)}
      className={s.handle}
      aria-label={`Move ${p.name}`}
      aria-describedby={hintId}
      aria-pressed={held === p.id}
      onKeyDown={handleKeyDown(p.id)}
      onBlur={handleBlur(p.id)}
    >
      <Icon name="grip" size={16} />
    </button>
  );

  return (
    <div className={s.arrange}>
      {/* the browser's own link dragging would cancel ours */}
      <ul ref={list} className={s.cards} aria-label="Platforms" onClickCapture={clickCapture} onDragStart={(e) => e.preventDefault()}>
        {order.map((id, i) => {
          const p = byId.get(id);
          if (!p) return null;
          const style = { "--i": i, "--pc": `var(--p-${p.id})` } as CSSProperties;
          const reorder = { ref: registerItem(p.id), onPointerDown: pointerDown(p.id), "data-dragging": dragging === p.id, "data-held": held === p.id };
          if (p.status !== "connected") {
            return (
              <li key={p.id} className={`${s.pcard} ${s.pending} card reveal`} style={style} {...reorder}>
                <div className={s.pTop}>
                  <span className={s.mark} aria-hidden="true">
                    <Icon name="plus" size={18} />
                  </span>
                  <span className={s.pName}>{p.name}</span>
                  <span className={s.badge}>Not connected</span>
                  {handle(p)}
                </div>
                <p className={s.pendingText}>Connect {p.name} to see its followers and posts next to the others.</p>
                <Link href="/onboarding/connect" className={s.connect} draggable={false}>
                  <Icon name="plus" size={15} /> Connect {p.name}
                </Link>
              </li>
            );
          }
          return (
            <li key={p.id} className={`${s.pcard} card lift reveal`} style={style} {...reorder}>
              <Link href={`/platforms/${p.id}`} className={s.cover} draggable={false} aria-label={`${p.name}: ${orNoData(p.followers)} ${p.followerNoun}, open details`} />
              <div className={s.pTop}>
                <span className={s.mark} aria-hidden="true">
                  {p.name.charAt(0)}
                </span>
                <span className={s.who}>
                  <span className={s.pName}>{p.name}</span>
                  <span className={s.acct}>{p.account}</span>
                </span>
                {handle(p)}
                <span className={s.go} aria-hidden="true">
                  <Icon name="arrow" size={15} />
                </span>
              </div>
              <div className={s.pNum}>
                {p.followers === null ? <span className={s.pBig}>{NO_DATA}</span> : <CountUp value={formatCompact(p.followers)} delay={300} className={s.pBig} />}
                <span className={s.pNoun}>{p.followerNoun}</span>
              </div>
              <Sparkline values={p.trend} color="var(--pc)" height={48} label={`${p.name} followers over the last 30 days, now ${orNoData(p.followers)}`} />
              <dl className={s.pStats}>
                <div title={`All-time views on your ${p.postCount} imported ${p.postCount === 1 ? "post" : "posts"}, as ${p.name} reports them`}>
                  <dt>Total views</dt>
                  <dd>{formatCompact(p.postViews)}</dd>
                </div>
                <div>
                  <dt>{range}-day growth</dt>
                  <dd className={p.followerGrowth[range] === null ? undefined : "up"}>{orNoData(p.followerGrowth[range], formatSigned)}</dd>
                </div>
                <div>
                  <dt>Engagement</dt>
                  <dd>{orNoData(p.engagement, formatPercent)}</dd>
                </div>
                <div>
                  <dt>Posts · 30d</dt>
                  <dd>{p.posts30}</dd>
                </div>
              </dl>
            </li>
          );
        })}
      </ul>
      <div className={s.arrangeBar}>
        <p id={hintId} className={s.arrangeHint}>
          <Icon name="grip" size={14} />
          <span>
            <span className={s.hintPointer}>Drag the cards to arrange them</span>
            <span className={s.hintTouch}>Press and hold a card to move it</span>
            <span className="sr-only">. With a keyboard, press Space on a card&apos;s move button, then the arrow keys.</span>
          </span>
        </p>
        {!isDefault && (
          <button type="button" className={s.reset} onClick={() => reorderTo(defaultOrder)}>
            Reset order
          </button>
        )}
      </div>
      {saveFailed && (
        <p className={s.saveError} role="alert">
          Couldn&apos;t save this order.{" "}
          <button type="button" onClick={() => save(saveFailed)}>
            Try again
          </button>
        </p>
      )}
      <p className="sr-only" role="status" aria-live="assertive">
        {announcement}
      </p>
    </div>
  );
}
