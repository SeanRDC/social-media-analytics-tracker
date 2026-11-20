import { APP_NAME } from "@/lib/brand";
import { appLink, BODY, emailFrame, esc, FONT, INK, MUTED, RULE } from "@/lib/emails/layout";
import type { Cell, Report } from "./build";

const fmt = (c: Cell) => (typeof c === "number" ? c.toLocaleString("en-US") : c);

const FOOTER = `You get this because the weekly email is on in ${APP_NAME}. Turn it off on the Reports page.`;

/** A report as an email: its sections as simple tables inside the branded frame. */
export function renderReportEmail(r: Report, appUrl: string): { subject: string; text: string; html: string } {
  const link = appUrl ? appLink(appUrl, "/overview") : "";
  const text = [
    `${r.title} · ${r.period}`,
    ...r.sections.flatMap((s) => ["", s.heading.toUpperCase(), ...s.rows.map((row) => row.map((c, i) => `${s.columns[i]}: ${fmt(c)}`).join(" · "))]),
    ...(link ? ["", `Open your dashboard: ${link}`] : []),
    "",
    FOOTER,
  ].join("\n");

  const th = `text-align:left;padding:8px 6px;border-bottom:1px solid ${RULE};font-family:${BODY};color:${MUTED};font-weight:600;font-size:12px`;
  const td = `padding:8px 6px;border-bottom:1px solid ${RULE};font-family:${BODY};font-size:13px;color:${INK}`;
  const sections = r.sections
    .map(
      (s) => `<tr><td class="px" style="padding:0 36px 22px">
   <h2 style="margin:0 0 8px;font-family:${FONT};font-weight:700;font-size:18px;letter-spacing:-0.3px;color:${INK}">${esc(s.heading)}</h2>
   <table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse">
    <tr>${s.columns.map((c) => `<th style="${th}">${esc(c)}</th>`).join("")}</tr>
    ${s.rows.map((row) => `<tr>${row.map((c) => `<td style="${td}${typeof c === "number" ? ";text-align:right" : ""}">${esc(String(fmt(c)))}</td>`).join("")}</tr>`).join("\n    ")}
   </table>
  </td></tr>`,
    )
    .join("\n");

  const html = emailFrame({
    preheader: `${r.title} · ${r.period}`,
    heading: r.title,
    intro: r.period,
    content: sections,
    ...(link ? { action: { href: link, label: "Open your dashboard" } } : {}),
    footer: FOOTER,
  });
  return { subject: `Your week: ${r.period.replace(/^Last 7 days · /, "")}`, text, html };
}
