import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PrivacyText } from "@/components/legal/PrivacyText";
import { LINKEDIN_SCOPES, META_SCOPES, scopeName, TIKTOK_SCOPES, YOUTUBE_SCOPES } from "@/lib/connect/scopes";

describe("PrivacyText", () => {
  it("names every permission the login code asks for, as platforms check it does", () => {
    const { container } = render(<PrivacyText />);
    const text = container.textContent ?? "";
    for (const scope of [...YOUTUBE_SCOPES, ...META_SCOPES, ...TIKTOK_SCOPES, ...LINKEDIN_SCOPES]) {
      expect(text).toContain(scopeName(scope));
    }
    expect(text).toContain("youtube.readonly and yt-analytics.readonly");
  });
});
