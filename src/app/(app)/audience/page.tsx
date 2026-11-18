import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { BestTimes } from "@/components/audience/BestTimes";
import { ShareBars } from "@/components/audience/ShareBars";
import s from "@/components/audience/Audience.module.css";
import { getAudience } from "@/lib/data/api";
import { PLATFORM_NAMES } from "@/lib/platforms";

export const metadata: Metadata = { title: "Audience" };

/** "United States" → "the United States", "Canada" → "Canada". */
const withArticle = (country: string) => (/^(United|Philippines|Netherlands)/.test(country) ? `the ${country}` : country);

export default async function AudiencePage() {
  const a = await getAudience();
  const sourceNames = a.sources.map((id) => PLATFORM_NAMES[id]).join(" and ");

  // small or new accounts: platforms only share demographics past a minimum audience
  if (!a.ages.length && !a.countries.length) {
    return (
      <div className={s.grid}>
        <section className={`${s.card} ${s.summary} card reveal`} style={{ "--i": 0 } as CSSProperties} aria-label="Audience summary">
          <p className={s.summaryText}>Not enough audience data yet.</p>
          <p className={s.caption}>
            YouTube and Instagram only share age and country breakdowns once an account has enough viewers. TikTok doesn&apos;t share them with apps like this one.
          </p>
        </section>
        <BestTimes slotLabels={a.slotLabels} days={a.bestTimes} />
      </div>
    );
  }

  const topAge = [...a.ages].sort((x, y) => y.share - x.share)[0];
  const topCountry = a.countries.filter((c) => c.name !== "Other").sort((x, y) => y.share - x.share)[0];
  const caption = `Share of audience · from ${sourceNames}`;
  const under35 = a.ages.filter((g) => ["13–17", "18–24", "25–34"].includes(g.label)).reduce((sum, g) => sum + g.share, 0);

  return (
    <div className={s.grid}>
      <section className={`${s.card} ${s.summary} card reveal`} style={{ "--i": 0 } as CSSProperties} aria-label="Audience summary">
        <p className={s.summaryText}>
          {topAge && (
            <>
              Most of your audience is <b>{topAge.label}</b>
              {topCountry ? " and " : ". "}
            </>
          )}
          {topCountry && (
            <>
              {topAge ? "the" : "The"} largest share watches from <b>{withArticle(topCountry.name)}</b>.{" "}
            </>
          )}
          {topAge && <>{under35}% are under 35.</>}
        </p>
        <p className={s.caption}>Based on {sourceNames}. TikTok doesn&apos;t share follower demographics with apps like this one.</p>
      </section>
      {a.ages.length > 0 && <ShareBars title="Age" caption={caption} rows={a.ages} index={1} />}
      {a.countries.length > 0 && <ShareBars title="Top countries" caption={caption} rows={a.countries.map((c) => ({ label: c.name, share: c.share }))} index={2} />}
      <BestTimes slotLabels={a.slotLabels} days={a.bestTimes} />
    </div>
  );
}
