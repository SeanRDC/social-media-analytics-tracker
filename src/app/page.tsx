import type { Metadata } from "next";
import { InstallApp } from "@/components/pwa/InstallApp";
import Link from "next/link";
import type { CSSProperties } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import s from "@/components/landing/Landing.module.css";
import { DailyViewsCard } from "@/components/overview/DailyViewsCard";
import { GrowthCard } from "@/components/overview/GrowthCard";
import { KpiTiles, SummaryStatement } from "@/components/overview/Summary";
import { RangeProvider } from "@/components/shell/RangeProvider";
import { ArrowButton } from "@/components/ui/ArrowButton";
import { APP_NAME } from "@/lib/brand";
import { getConnections, getDailyViews, getOverview, getPlatform } from "@/lib/data/sample-api";

export const metadata: Metadata = {
  title: { absolute: `${APP_NAME} · Every channel, one calm dashboard` },
};

const FEATURES: { icon: IconName; title: string; body: string; tone: "cobalt" | "lime" | "lilac" }[] = [
  { icon: "grid", title: "Every platform together", body: "Followers, views and engagement from YouTube, TikTok, Instagram, Facebook and LinkedIn, side by side and in the same units.", tone: "cobalt" },
  { icon: "sparkle", title: "See what's working", body: "Daily views against last week, your best posts and when your posts do best, explained in plain words instead of raw numbers.", tone: "lime" },
  { icon: "download", title: "Reports in a click", body: "Monthly, weekly and client-ready summaries as PDF or CSV, or emailed to you every Monday before the week starts.", tone: "lilac" },
];

const MARQUEE = ["Followers", "Views", "Engagement", "Best time to post", "Top posts", "Weekly reports"];

const reveal = (i: number) => ({ "--i": i }) as CSSProperties;

export default async function Landing() {
  const [overview, views, connections] = await Promise.all([getOverview(), getDailyViews(), getConnections()]);
  const top = await getPlatform(overview.topPlatform);

  return (
    <div className={s.page}>
      <header className={s.navWrap}>
        <div className={s.nav}>
          <Link href="/" className={s.brand} aria-label={`${APP_NAME} home`}>
            <span className={s.logo}>
              <Icon name="logo" size={18} strokeWidth={2.2} />
            </span>
            <span aria-hidden="true">{APP_NAME}</span>
          </Link>
          <nav className={s.navLinks} aria-label="Site">
            <a href="#features">Features</a>
            <a href="#preview">Preview</a>
            <Link href="/sign-in">Sign in</Link>
          </nav>
          <div className={s.navEnd}>
            <InstallApp tone="dark" />
            <Link href="/sign-in" className={s.navCta}>
              Start free
            </Link>
          </div>
        </div>
      </header>

      <main>
        <section className={s.hero} aria-labelledby="landing-h">
          <h1 id="landing-h" className={`${s.h1} reveal`} style={reveal(1)}>
            <span className={s.row}>
              <span className={`badges ${s.heroBadges}`} aria-hidden="true">
                <span className={`badge-round ${s.bGrey}`}>
                  <Icon name="sparkle" size={30} />
                </span>
                <span className={`badge-round ${s.bCobalt}`}>
                  <Icon name="chart" size={30} />
                </span>
              </span>
              Every channel,
            </span>{" "}
            <span className={`${s.row} ${s.rowIndent}`}>
              one <span className={s.soft}>calm</span>
            </span>{" "}
            <span className={`${s.row} ${s.rowRight}`}>
              <span className={`badge-round ${s.bLime}`} aria-hidden="true">
                <Icon name="users" size={30} />
              </span>
              dashboard
            </span>
          </h1>

          <div className={`${s.heroFoot} reveal`} style={reveal(2)}>
            <p className={s.lead}>Connect your accounts once and see how your audience is growing across every platform, which posts are working, and when to post next.</p>
            <div className={s.ctas}>
              <ArrowButton href="/sign-in">Start free</ArrowButton>
              <ArrowButton href="#preview" tone="soft">
                See a preview
              </ArrowButton>
            </div>
          </div>

          <ul className={`${s.platforms} reveal`} style={reveal(3)} aria-label="Supported platforms">
            {connections.map((c) => (
              <li key={c.id}>
                <span className="dot" style={{ background: `var(--p-${c.id})` }} />
                {c.name}
              </li>
            ))}
          </ul>
        </section>

        <section id="preview" className={`${s.preview} reveal`} style={reveal(4)} aria-label="Dashboard preview with sample data">
          <RangeProvider>
            <div className={s.previewGrid}>
              <div className={s.pStatement}>
                <SummaryStatement accountName={overview.accountName} connectedCount={overview.connectedCount} metrics={overview.metrics} />
              </div>
              <div className={s.pKpis}>
                <KpiTiles metrics={overview.metrics} />
              </div>
              <div className={s.pChart}>
                <DailyViewsCard views={views} />
              </div>
              {top && (
                <div className={s.pGrowth}>
                  <GrowthCard week={overview.metrics[7]} weekGrowth={overview.weekGrowth} top={top} />
                </div>
              )}
            </div>
          </RangeProvider>
          <p className={s.sample}>Sample data from a demo studio account</p>
        </section>

        <div className={s.marquee} aria-hidden="true">
          <div className={s.track}>
            {[0, 1].map((copy) => (
              <span key={copy} className={s.group}>
                {MARQUEE.map((w) => (
                  <span key={w} className={s.word}>
                    {w}
                    <i className={s.star}>
                      <Icon name="sparkle" size={22} />
                    </i>
                  </span>
                ))}
              </span>
            ))}
          </div>
        </div>

        <section id="features" className={s.featuresWrap} aria-labelledby="features-h">
          <div className={s.featuresHead}>
            <h2 id="features-h" className={s.h2}>
              Your key to a clearer picture of every audience
            </h2>
            <p className={s.lead}>Ready for plain-language insight across every platform, updated every day?</p>
          </div>
          <div className={s.features}>
            {FEATURES.map((f, i) => (
              <article key={f.title} className={`${s.feature} ${s[f.tone]} lift reveal`} style={reveal(i + 5)}>
                <span className={s.fIcon} aria-hidden="true">
                  <Icon name={f.icon} size={22} />
                </span>
                <h3 className={s.fTitle}>{f.title}</h3>
                <p className={s.fBody}>{f.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className={s.final} aria-labelledby="final-h">
          <h2 id="final-h" className={s.finalH}>
            See your whole audience in about <span className={s.finalHl}>two minutes.</span>
          </h2>
          <div className={s.finalFoot}>
            <p>Read-only access. We never post for you, and you can disconnect at any time.</p>
            <Link href="/sign-in" className={s.finalCta}>
              Start free
              <span aria-hidden="true">
                <Icon name="arrow" size={16} strokeWidth={2} />
              </span>
            </Link>
          </div>
        </section>
      </main>

      <footer className={s.footer}>
        <div className={s.footRow}>
          <span>Works on iPhone, Android and desktop. Add it to your home screen from the browser menu.</span>
          <nav aria-label="Legal" className={s.legal}>
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
            <Link href="/data-deletion">Data deletion</Link>
          </nav>
        </div>
        <p className={s.wordmark} aria-hidden="true">
          {APP_NAME}
        </p>
      </footer>
    </div>
  );
}
