import type { Metadata } from "next";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import s from "@/components/landing/Landing.module.css";
import { GrowthCard } from "@/components/overview/GrowthCard";
import { KpiTiles, SummaryStatement } from "@/components/overview/Summary";
import { DailyViewsCard } from "@/components/overview/DailyViewsCard";
import { RangeProvider } from "@/components/shell/RangeProvider";
import { ArrowButton } from "@/components/ui/ArrowButton";
import { APP_NAME } from "@/lib/brand";
import { getConnections, getDailyViews, getOverview, getPlatform } from "@/lib/data/sample-api";

export const metadata: Metadata = {
  title: { absolute: `${APP_NAME} · Every channel, one calm dashboard` },
};

const FEATURES: { icon: IconName; title: string; body: string }[] = [
  { icon: "grid", title: "Every platform together", body: "Followers, views and engagement from YouTube, TikTok, Instagram, Facebook, LinkedIn and X, side by side and in the same units." },
  { icon: "sparkle", title: "See what's working", body: "Daily views against last week, your best posts and when your posts do best, explained in plain words instead of raw numbers." },
  { icon: "download", title: "Reports in a click", body: "Monthly, weekly and client-ready summaries as PDF or CSV, or emailed to you every Monday before the week starts." },
];

export default async function Landing() {
  const [overview, views, connections] = await Promise.all([getOverview(), getDailyViews(), getConnections()]);
  const top = await getPlatform(overview.topPlatform);

  return (
    <div className={s.page}>
      <header className={s.nav}>
        <Link href="/" className={s.brand}>
          <span className={s.logo}>
            <Icon name="logo" strokeWidth={2} />
          </span>
          {APP_NAME}
        </Link>
        <nav className={s.navLinks} aria-label="Site">
          <Link href="/overview">Live demo</Link>
          <Link href="/sign-in">Sign in</Link>
        </nav>
        <Link href="/sign-in" className={s.navCta}>
          Start free
        </Link>
      </header>

      <main>
        <section className={s.hero} aria-labelledby="landing-h">
          <span className={`${s.eyebrow} reveal`}>Social analytics for creators and studios</span>
          <h1 id="landing-h" className={`${s.h1} reveal`} style={{ "--i": 1 } as CSSProperties}>
            Every channel. One calm dashboard.
          </h1>
          <p className={`${s.lead} reveal`} style={{ "--i": 2 } as CSSProperties}>
            Connect your accounts once and see how your audience is growing across every platform, which posts are working, and when to post next.
          </p>
          <div className={`${s.ctas} reveal`} style={{ "--i": 3 } as CSSProperties}>
            <ArrowButton href="/sign-in">Start free</ArrowButton>
            <ArrowButton href="/overview" tone="glass">
              Open the live demo
            </ArrowButton>
          </div>
          <ul className={`${s.platforms} reveal`} style={{ "--i": 4 } as CSSProperties} aria-label="Supported platforms">
            {connections.map((c) => (
              <li key={c.id}>
                <span className="dot" style={{ background: `var(--p-${c.id})` }} />
                {c.name}
              </li>
            ))}
          </ul>
        </section>

        <section className={`${s.preview} reveal`} style={{ "--i": 4 } as CSSProperties} aria-label="Dashboard preview with sample data">
          <RangeProvider>
            <div className={s.previewGrid}>
              <SummaryStatement accountName={overview.accountName} connectedCount={overview.connectedCount} metrics={overview.metrics} />
              <KpiTiles metrics={overview.metrics} />
              <div className={s.previewSide}>
                <DailyViewsCard views={views} />
                {top && <GrowthCard week={overview.metrics[7]} weekGrowth={overview.weekGrowth} top={top} />}
              </div>
            </div>
          </RangeProvider>
          <p className={s.sample}>Sample data from a demo studio account</p>
        </section>

        <section className={s.features} aria-label="Features">
          {FEATURES.map((f, i) => (
            <article key={f.title} className={`${s.feature} card reveal`} style={{ "--i": i + 5 } as CSSProperties}>
              <span className={s.fIcon} aria-hidden="true">
                <Icon name={f.icon} size={18} />
              </span>
              <h2 className={s.fTitle}>{f.title}</h2>
              <p className={s.fBody}>{f.body}</p>
            </article>
          ))}
        </section>

        <section className={`${s.final} card`} aria-labelledby="final-h">
          <h2 id="final-h" className={s.finalH}>
            See your whole audience in about two minutes.
          </h2>
          <p className={s.lead}>Read-only access. We never post for you, and you can disconnect at any time.</p>
          <ArrowButton href="/sign-in">Start free</ArrowButton>
        </section>
      </main>

      <footer className={s.footer}>
        <span>{APP_NAME}</span>
        <span>Works on iPhone, Android and desktop. Add it to your home screen from the browser menu.</span>
        <nav aria-label="Legal" style={{ display: "flex", gap: 14 }}>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/data-deletion">Data deletion</Link>
        </nav>
      </footer>
    </div>
  );
}
