import { ImageResponse } from "next/og";
import { APP_NAME } from "@/lib/brand";

export const alt = `${APP_NAME}: every channel, one calm dashboard`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TILES: [string, string, string][] = [
  ["#3b5bff", "#ffffff", "Views per day"],
  ["#d7f25a", "#141416", "Followers"],
  ["#b7a8ff", "#141416", "Top posts"],
  ["#7fd8ae", "#141416", "Best time"],
];

/** The preview card shown when ispector.site is shared: the headline beside the Overview's colour tiles. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f3f2ee", padding: 64, gap: 48, fontFamily: "sans-serif" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 26, background: "#d7f25a", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 18, height: 18, borderRadius: 9, background: "#141416" }} />
            </div>
            <div style={{ fontSize: 40, fontWeight: 700, color: "#141416", letterSpacing: -1 }}>{APP_NAME}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3, color: "#141416" }}>Every channel, one calm dashboard</div>
            <div style={{ fontSize: 23, color: "#4a4a52" }}>YouTube · Facebook · Instagram · TikTok · LinkedIn</div>
          </div>
        </div>
        <div style={{ width: 420, display: "flex", flexWrap: "wrap", gap: 16, alignContent: "center" }}>
          {TILES.map(([bg, fg, label]) => (
            <div key={label} style={{ width: 202, height: 202, borderRadius: 28, background: bg, color: fg, display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 24 }}>
              <div style={{ width: 22, height: 22, borderRadius: 11, background: fg }} />
              <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5 }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    ),
    size,
  );
}
