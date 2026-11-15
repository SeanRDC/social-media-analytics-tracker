import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Icon, type IconName } from "@/components/icons/Icon";
import { ScheduleCard } from "@/components/reports/ScheduleCard";
import s from "@/components/reports/Reports.module.css";
import { ExportButton } from "@/components/ui/ExportButton";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Reports" };

const PRESETS: { title: string; desc: string; icon: IconName; includes: string[] }[] = [
  { title: "Monthly performance", desc: "Followers, views and engagement for every platform over the last 30 days.", icon: "chart", includes: ["Overview", "Platforms", "Top posts"] },
  { title: "Weekly snapshot", desc: "One page with the week's growth and your best post. Good for Monday mornings.", icon: "calendar", includes: ["Growth", "Best post"] },
  { title: "Content deep-dive", desc: "Every post ranked by views and engagement, with watch time and shares.", icon: "play", includes: ["All posts", "Watch time", "Shares"] },
  { title: "Client summary", desc: "A clean summary with your branding, ready to send to a client.", icon: "users", includes: ["Highlights", "Audience", "Next steps"] },
];

export default async function ReportsPage() {
  const user = await requireUser();
  return (
    <div className={s.grid}>
      {PRESETS.map((p, i) => (
        <section key={p.title} className={`${s.card} ${s.preset} glass rim sweep lift reveal`} style={{ "--i": i + 1 } as CSSProperties} aria-labelledby={`rp-${i}`}>
          <span className={s.icon} aria-hidden="true">
            <Icon name={p.icon} size={18} />
          </span>
          <h2 id={`rp-${i}`} className={s.h2}>
            {p.title}
          </h2>
          <p className={s.desc}>{p.desc}</p>
          <ul className={s.includes} aria-label="Includes">
            {p.includes.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <div className={s.exports}>
            <ExportButton format="PDF" report={p.title} />
            <ExportButton format="CSV" report={p.title} />
          </div>
        </section>
      ))}
      <ScheduleCard email={user.email} />
      <p className={`${s.footnote} reveal`} style={{ "--i": 6 } as CSSProperties}>
        This prototype prepares exports without creating files. Real PDF and CSV downloads and email delivery arrive with the backend.
      </p>
    </div>
  );
}
