"use client";

import { useEffect } from "react";

/**
 * Last resort when the root layout itself fails. It replaces the whole
 * document, so it can't use the app's stylesheet or theme: everything is inline
 * and follows the device's light or dark setting.
 */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <title>Something went wrong · Ispector</title>
        <style>{`:root{color-scheme:light dark}body{font-family:"Segoe UI",system-ui,sans-serif;background:#f3f2ee;color:#141416}@media (prefers-color-scheme:dark){body{background:#0e0e10;color:#f2f2ef}.card{background:#18181b!important}.btn{background:#f2f2ef!important;color:#141416!important}}`}</style>
        <main style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "24px 16px" }}>
          <div className="card" style={{ maxWidth: 440, width: "100%", background: "#fff", borderRadius: 24, padding: "32px 28px", display: "flex", flexDirection: "column", gap: 14 }}>
            <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.1, letterSpacing: "-0.02em" }}>Ispector couldn&apos;t load</h1>
            <p style={{ margin: 0, opacity: 0.7, lineHeight: 1.5 }}>Something went wrong on our side. Your data is safe. Try again in a moment.</p>
            <button type="button" className="btn" onClick={retry} style={{ font: "inherit", fontWeight: 600, border: 0, borderRadius: 14, padding: "14px 20px", background: "#141416", color: "#fff", cursor: "pointer" }}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
