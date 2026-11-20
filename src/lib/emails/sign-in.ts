/**
 * The sign-in email ("The Tiles" design, chosen 2026-11-20): a white card on
 * the site's off-white page, a 2×2 mosaic of the Overview's colour tiles
 * previewing what's inside, and a black button.
 *
 * Email clients ignore stylesheets and most modern CSS, so everything is
 * tables with inline styles and no images (nothing for a client to block).
 * The one <style> block only stacks the tiles on phones where clients allow it.
 */
import { APP_NAME } from "@/lib/brand";

export const SIGN_IN_LINK_MINUTES = 10;

const FONT = "'Urbanist','Segoe UI',Helvetica,Arial,sans-serif";
const BODY = "'Segoe UI',Helvetica,Arial,sans-serif";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** What's waiting inside, one Overview tile each: background, text colour, title, line. */
const TILES: [string, string, string, string][] = [
  ["#3b5bff", "#ffffff", "Views per day", "Every platform, one line each"],
  ["#d7f25a", "#141416", "Followers", "Growth across all channels"],
  ["#b7a8ff", "#141416", "Top posts", "What worked this week"],
  ["#7fd8ae", "#141416", "Best time", "When your audience is online"],
];

const tile = ([bg, fg, title, line]: [string, string, string, string]) =>
  `<td class="tile" width="50%" style="padding:0 0 10px 0;vertical-align:top"><div style="background:${bg};border-radius:18px;padding:18px 18px 20px;margin-right:10px"><p style="margin:0 0 26px;font-family:${BODY};font-size:20px;line-height:1;color:${fg}">&#9679;</p><p style="margin:0 0 4px;font-family:${FONT};font-weight:700;font-size:20px;letter-spacing:-0.4px;color:${fg}">${title}</p><p style="margin:0;font-family:${BODY};font-size:13px;color:${fg};opacity:0.85">${line}</p></div></td>`;

const logo = `<table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="width:30px;height:30px;border-radius:15px;background:#d7f25a;text-align:center;vertical-align:middle"><div style="width:10px;height:10px;border-radius:5px;background:#141416;margin:0 auto"></div></td><td style="padding-left:10px;font-family:${FONT};font-weight:700;font-size:19px;letter-spacing:-0.3px;color:#141416">${APP_NAME}</td></tr></table>`;

export function renderSignInEmail(url: string, support: string): { subject: string; text: string; html: string } {
  const link = esc(url);
  const help = esc(support);
  const expiry = `Works once · expires in ${SIGN_IN_LINK_MINUTES} minutes`;

  const text = `Your channels are waiting.

Sign in to ${APP_NAME}:
${url}

The link works once and expires in ${SIGN_IN_LINK_MINUTES} minutes.

Link not working? Email ${support} and we'll help you sign in.

Didn't ask to sign in? Ignore this email. Nobody can get in without the link.`;

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"><title>Sign in to ${APP_NAME}</title><link href="https://fonts.googleapis.com/css2?family=Urbanist:wght@600;700&amp;display=swap" rel="stylesheet"><style>body{margin:0;padding:0;background:#f3f2ee}a{text-decoration:none}@media (max-width:480px){.px{padding-left:22px!important;padding-right:22px!important}.h1{font-size:34px!important}.tile{display:block!important;width:100%!important}}</style></head>
<body style="margin:0;padding:0;background:#f3f2ee">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">Your channels are waiting. The link expires in ${SIGN_IN_LINK_MINUTES} minutes.</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f2ee"><tr><td align="center" style="padding:28px 12px">
 <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:26px">
  <tr><td class="px" style="padding:30px 36px 6px">${logo}</td></tr>
  <tr><td class="px" style="padding:22px 36px 0">
   <h1 class="h1" style="margin:0 0 12px;font-family:${FONT};font-weight:700;font-size:40px;line-height:1.04;letter-spacing:-1.2px;color:#141416">Your channels are waiting.</h1>
   <p style="margin:0 0 24px;font-family:${BODY};font-size:16px;line-height:1.55;color:#4a4a52">Here's what's inside once you sign in:</p>
  </td></tr>
  <tr><td class="px" style="padding:0 26px 0 36px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${tile(TILES[0])}${tile(TILES[1])}</tr><tr>${tile(TILES[2])}${tile(TILES[3])}</tr></table></td></tr>
  <tr><td class="px" style="padding:18px 36px 0">
   <table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="border-radius:14px;background:#141416"><a href="${link}" style="display:inline-block;padding:16px 30px;font-family:${BODY};font-size:16px;font-weight:600;color:#ffffff">Sign in to ${APP_NAME}</a></td></tr></table>
   <p style="margin:14px 0 0;font-family:${BODY};font-size:13px;color:#6e6e76">${expiry}</p>
  </td></tr>
  <tr><td class="px" style="padding:26px 36px 32px">
   <div style="height:1px;background:#ecebe6;margin-bottom:18px"></div>
   <p style="margin:0 0 6px;font-family:${BODY};font-size:12px;color:#8a8a92">Button not working? Paste this into your browser:</p>
   <p style="margin:0 0 16px;font-family:${BODY};font-size:12px;word-break:break-all;color:#3b5bff">${link}</p>
   <p style="margin:0;font-family:${BODY};font-size:13px;line-height:1.5;color:#4a4a52">Still can't get in? Email <a href="mailto:${help}" style="color:#3b5bff;font-weight:600">${help}</a> and we'll help you sign in.</p>
  </td></tr>
 </table>
 <p style="max-width:560px;margin:18px auto 0;font-family:${BODY};font-size:12px;line-height:1.6;color:#8a8a92;text-align:center">Didn't ask to sign in? Ignore this email. Nobody can get in without the link.</p>
</td></tr></table>
</body></html>`;

  return { subject: "Sign in to see every channel", text, html };
}
