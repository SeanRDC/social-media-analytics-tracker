import { APP_NAME } from "@/lib/brand";
import type { Cell, Report } from "./build";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const fmt = (c: Cell) => (typeof c === "number" ? c.toLocaleString("en-US") : c);

/** A report as an email: simple tables with inline styles, which every mail app renders. */
export function renderReportEmail(r: Report, appUrl: string): { subject: string; text: string; html: string } {
  const link = appUrl ? `${appUrl.replace(/\/$/, "")}/overview` : "";
  const text = [
    `${r.title} · ${r.period}`,
    ...r.sections.flatMap((s) => ["", s.heading.toUpperCase(), ...s.rows.map((row) => row.map((c, i) => `${s.columns[i]}: ${fmt(c)}`).join(" · "))]),
    ...(link ? ["", `Open your dashboard: ${link}`] : []),
    "",
    `You get this because the weekly email is on in ${APP_NAME}. Turn it off on the Reports page.`,
  ].join("\n");

  const th = "text-align:left;padding:6px 8px;border-bottom:1px solid #dde1e7;color:#5b6472;font-weight:600;font-size:12px";
  const td = "padding:6px 8px;border-bottom:1px solid #eef0f3;font-size:13px";
  const sections = r.sections
    .map(
      (s) => `<h2 style="font-size:15px;margin:24px 0 8px">${esc(s.heading)}</h2>
<table role="presentation" cellspacing="0" cellpadding="0" style="width:100%;border-collapse:collapse">
<tr>${s.columns.map((c) => `<th style="${th}">${esc(c)}</th>`).join("")}</tr>
${s.rows.map((row) => `<tr>${row.map((c) => `<td style="${td}${typeof c === "number" ? ";text-align:right" : ""}">${esc(String(fmt(c)))}</td>`).join("")}</tr>`).join("\n")}
</table>`,
    )
    .join("\n");
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#16181c;max-width:640px;margin:0 auto;padding:24px">
<p style="font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#5b6472;margin:0">${esc(APP_NAME)}</p>
<h1 style="font-size:22px;margin:6px 0 2px">${esc(r.title)}</h1>
<p style="color:#5b6472;margin:0">${esc(r.period)}</p>
${sections}
${link ? `<p style="margin:28px 0"><a href="${esc(link)}" style="background:#16181c;color:#fff;padding:10px 18px;border-radius:99px;text-decoration:none;font-weight:600">Open your dashboard</a></p>` : ""}
<p style="color:#8a93a1;font-size:12px">You get this because the weekly email is on in ${esc(APP_NAME)}. Turn it off on the Reports page.</p>
</div>`;
  return { subject: `Your week: ${r.period.replace(/^Last 7 days · /, "")}`, text, html };
}
