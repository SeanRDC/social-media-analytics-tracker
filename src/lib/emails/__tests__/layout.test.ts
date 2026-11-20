import { describe, expect, it } from "vitest";
import { appLink, emailFrame } from "@/lib/emails/layout";

describe("emailFrame", () => {
  const html = emailFrame({
    preheader: "Preview <line>",
    heading: "A post is taking off",
    intro: `"Studio tour" has 284K views`,
    action: { href: "https://ispector.site/content?post=a&b=1", label: "Open Ispector" },
    note: "A note",
    footer: "Why you got this",
  });

  it("puts the headline, text, button and footer in the branded card", () => {
    expect(html).toContain(">A post is taking off</h1>");
    expect(html).toContain("&quot;Studio tour&quot; has 284K views");
    expect(html).toContain(`href="https://ispector.site/content?post=a&amp;b=1"`);
    expect(html).toContain(">Open Ispector</a>");
    expect(html).toContain("A note");
    expect(html).toContain("Why you got this");
    expect(html).toContain(">Ispector</td>");
  });

  it("escapes every piece of plain text", () => {
    expect(html).toContain("Preview &lt;line&gt;");
    const hostile = emailFrame({ preheader: "x", heading: "<script>a</script>", intro: "<img src=x onerror=1>", footer: "<b>f</b>" });
    expect(hostile).not.toMatch(/<script>a|<img src=x|<b>f<\/b>/);
  });

  it("leaves the button out when there is no action", () => {
    expect(emailFrame({ preheader: "p", heading: "h", intro: "i", footer: "f" })).not.toContain("<a href");
  });
});

describe("appLink", () => {
  it("joins the site origin and an app path without doubling the slash", () => {
    expect(appLink("https://ispector.site/", "/settings")).toBe("https://ispector.site/settings");
  });
});
