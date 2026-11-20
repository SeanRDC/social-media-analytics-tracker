/**
 * The branded frame every Ispector email uses: the off-white page, a white
 * card with the logo, a big headline, a black button and a small footer.
 *
 * Email clients ignore stylesheets and most modern CSS, so the frame is tables
 * with inline styles and no images (nothing for a client to block). The one
 * <style> block only tightens the padding on phones where clients allow it.
 */
import { APP_NAME } from "@/lib/brand";

export const FONT = "'Urbanist','Segoe UI',Helvetica,Arial,sans-serif";
export const BODY = "'Segoe UI',Helvetica,Arial,sans-serif";
export const INK = "#141416";
export const MUTED = "#6e6e76";
export const ACCENT = "#3b5bff";
export const RULE = "#ecebe6";

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** An app path as a full link for an email; `appUrl` is the site's origin. */
export const appLink = (appUrl: string, path: string) => `${appUrl.replace(/\/$/, "")}${path}`;

export interface Frame {
  /** Inbox preview line, hidden in the email itself. */
  preheader: string;
  heading: string;
  /** Plain text under the headline. */
  intro: string;
  /** Extra HTML rows between the intro and the button (already escaped). */
  content?: string;
  action?: { href: string; label: string };
  /** Small line under the button, plain text. */
  note?: string;
  /** HTML below a divider at the bottom of the card (already escaped). */
  after?: string;
  /** Plain text under the card: why they got this email. */
  footer: string;
}

const logo = `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="width:30px;height:30px;border-radius:15px;background:#d7f25a;text-align:center;vertical-align:middle"><div style="width:10px;height:10px;border-radius:5px;background:${INK};margin:0 auto"></div></td><td style="padding-left:10px;font-family:${FONT};font-weight:700;font-size:19px;letter-spacing:-0.3px;color:${INK}">${APP_NAME}</td></tr></table>`;

export function emailFrame(f: Frame): string {
  const button = f.action
    ? `<tr><td class="px" style="padding:18px 36px 0"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:14px;background:${INK}"><a href="${esc(f.action.href)}" style="display:inline-block;padding:16px 30px;font-family:${BODY};font-size:16px;font-weight:600;color:#ffffff">${esc(f.action.label)}</a></td></tr></table>${f.note ? `<p style="margin:14px 0 0;font-family:${BODY};font-size:13px;color:${MUTED}">${esc(f.note)}</p>` : ""}</td></tr>`
    : "";
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>${esc(f.heading)}</title><link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@600;700&amp;display=swap" rel="stylesheet"><style>body{margin:0;padding:0;background:#f3f2ee}a{text-decoration:none}@media (max-width:480px){.px{padding-left:22px!important;padding-right:22px!important}.h1{font-size:34px!important}.tile{display:block!important;width:100%!important}}</style></head>
<body style="margin:0;padding:0;background:#f3f2ee">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(f.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f2ee"><tr><td align="center" style="padding:28px 12px">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:26px">
  <tr><td class="px" style="padding:30px 36px 6px">${logo}</td></tr>
  <tr><td class="px" style="padding:22px 36px 0">
   <h1 class="h1" style="margin:0 0 12px;font-family:${FONT};font-weight:700;font-size:40px;line-height:1.04;letter-spacing:-1.2px;color:${INK}">${esc(f.heading)}</h1>
   <p style="margin:0 0 24px;font-family:${BODY};font-size:16px;line-height:1.55;color:#4a4a52">${esc(f.intro)}</p>
  </td></tr>
  ${f.content ?? ""}
  ${button}
  <tr><td class="px" style="padding:26px 36px 32px">${f.after ? `<div style="height:1px;background:${RULE};margin-bottom:18px"></div>${f.after}` : ""}</td></tr>
 </table>
 <p style="max-width:560px;margin:18px auto 0;font-family:${BODY};font-size:12px;line-height:1.6;color:#8a8a92;text-align:center">${esc(f.footer)}</p>
</td></tr></table>
</body></html>`;
}
