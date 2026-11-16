import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Icon } from "@/components/icons/Icon";
import { saveSchedule } from "@/app/actions/reports";
import { ScheduleCard } from "@/components/reports/ScheduleCard";
import s from "@/components/reports/Reports.module.css";
import { ExportButton } from "@/components/ui/ExportButton";
import { getSchedule } from "@/lib/reports/schedule";
import { PRESETS } from "@/lib/reports/build";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Reports" };

export default async function ReportsPage() {
  const user = await requireUser();
  const schedule = await getSchedule(user.id);
  return (
    <div className={s.grid}>
      {PRESETS.map((p, i) => (
        <section key={p.id} className={`${s.card} ${s.preset} glass rim sweep lift reveal`} style={{ "--i": i + 1 } as CSSProperties} aria-labelledby={`rp-${i}`}>
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
            <ExportButton format="PDF" report={p.title} href={`/reports/print/${p.id}`} />
            <ExportButton format="CSV" report={p.title} href={`/api/export/${p.id}`} />
          </div>
        </section>
      ))}
      <ScheduleCard email={user.email} initial={schedule} onSave={saveSchedule} />
      <p className={`${s.footnote} reveal`} style={{ "--i": 6 } as CSSProperties}>
        CSV opens in any spreadsheet. PDF opens a print-ready page: choose Save as PDF in the print dialog.
      </p>
    </div>
  );
}
