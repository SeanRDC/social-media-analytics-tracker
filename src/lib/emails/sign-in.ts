/**
 * The sign-in email ("The Tiles" design, chosen 2026-11-20): a 2×2 mosaic of
 * the Overview's colour tiles previewing what's inside, in the shared frame.
 */
import { APP_NAME } from "@/lib/brand";
import { ACCENT, BODY, emailFrame, esc, FONT } from "./layout";

export const SIGN_IN_LINK_MINUTES = 10;

/** What's waiting inside, one Overview tile each: background, text colour, title, line. */
const TILES: [string, string, string, string][] = [
  ["#3b5bff", "#ffffff", "Views per day", "Every platform, one line each"],
  ["#d7f25a", "#141416", "Followers", "Growth across all channels"],
  ["#b7a8ff", "#141416", "Top posts", "What worked this week"],
  ["#7fd8ae", "#141416", "Best time", "When your audience is online"],
];

const tile = ([bg, fg, title, line]: [string, string, string, string]) =>
  `<td class="tile" width="50%" style="padding:0 0 10px 0;vertical-align:top"><div style="background:${bg};border-radius:18px;padding:18px 18px 20px;margin-right:10px"><p style="margin:0 0 26px;font-family:${BODY};font-size:20px;line-height:1;color:${fg}">&#9679;</p><p style="margin:0 0 4px;font-family:${FONT};font-weight:700;font-size:20px;letter-spacing:-0.4px;color:${fg}">${title}</p><p style="margin:0;font-family:${BODY};font-size:13px;color:${fg};opacity:0.85">${line}</p></div></td>`;

const tiles = `<tr><td class="px" style="padding:0 26px 0 36px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>${tile(TILES[0])}${tile(TILES[1])}</tr><tr>${tile(TILES[2])}${tile(TILES[3])}</tr></table></td></tr>`;

export function renderSignInEmail(url: string, support: string): { subject: string; text: string; html: string } {
  const text = `Your channels are waiting.

Sign in to ${APP_NAME}:
${url}

The link works once and expires in ${SIGN_IN_LINK_MINUTES} minutes.

Link not working? Email ${support} and we'll help you sign in.

Didn't ask to sign in? Ignore this email. Nobody can get in without the link.`;

  const help = esc(support);
  const html = emailFrame({
    preheader: `Your channels are waiting. The link expires in ${SIGN_IN_LINK_MINUTES} minutes.`,
    heading: "Your channels are waiting.",
    intro: "Here's what's inside once you sign in:",
    content: tiles,
    action: { href: url, label: `Sign in to ${APP_NAME}` },
    note: `Works once · expires in ${SIGN_IN_LINK_MINUTES} minutes`,
    after: `<p style="margin:0 0 6px;font-family:${BODY};font-size:12px;color:#8a8a92">Button not working? Paste this into your browser:</p>
   <p style="margin:0 0 16px;font-family:${BODY};font-size:12px;word-break:break-all;color:${ACCENT}">${esc(url)}</p>
   <p style="margin:0;font-family:${BODY};font-size:13px;line-height:1.5;color:#4a4a52">Still can't get in? Email <a href="mailto:${help}" style="color:${ACCENT};font-weight:600">${help}</a> and we'll help you sign in.</p>`,
    footer: "Didn't ask to sign in? Ignore this email. Nobody can get in without the link.",
  });

  return { subject: "Sign in to see every channel", text, html };
}
