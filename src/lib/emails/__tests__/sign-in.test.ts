import { describe, expect, it } from "vitest";
import { renderSignInEmail } from "@/lib/emails/sign-in";

const URL = "https://ispector.site/api/auth/magic-link/verify?token=abc&callbackURL=%2Foverview";

describe("renderSignInEmail", () => {
  const email = renderSignInEmail(URL, "support@ispector.site");

  it("puts the sign-in link in the button and the copy-paste fallback, escaped for HTML", () => {
    expect(email.html).toContain(`href="https://ispector.site/api/auth/magic-link/verify?token=abc&amp;callbackURL=%2Foverview"`);
    expect(email.html.match(/token=abc&amp;callbackURL/g)).toHaveLength(2);
    expect(email.html).not.toContain("token=abc&callbackURL");
  });

  it("tells people how long the link lasts and how to reach support", () => {
    for (const body of [email.html, email.text]) {
      expect(body).toContain("expires in 10 minutes");
      expect(body).toContain("support@ispector.site");
    }
    expect(email.html).toContain(`href="mailto:support@ispector.site"`);
  });

  it("has a plain-text version with the raw link", () => {
    expect(email.text).toContain(URL);
    expect(email.text).not.toContain("<");
    expect(email.subject).toBe("Sign in to see every channel");
  });

  it("escapes a hostile support address instead of injecting markup", () => {
    const bad = renderSignInEmail(URL, `"><script>x</script>`);
    expect(bad.html).not.toContain("<script>x");
  });
});
