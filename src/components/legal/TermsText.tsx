import { APP_NAME, LEGAL_CONTACT } from "@/lib/brand";

const ext = { target: "_blank", rel: "noreferrer" } as const;

/** The Terms of Service text, shared by /terms and the agreement screen (/welcome). */
export function TermsText() {
  return (
    <>
      <p>
        These terms apply when you use {APP_NAME} at ispector.site. By creating an account or connecting a platform, you agree to them and to our{" "}
        <a href="/privacy">privacy policy</a>.
      </p>

      <h2>The service</h2>
      <p>
        {APP_NAME} shows read-only analytics for social media accounts you own or manage: YouTube channels, Facebook Pages, Instagram Professional accounts, TikTok accounts and
        LinkedIn company Pages. It is currently free to use. We never post or make changes on your accounts.
      </p>

      <h2>Who can use it</h2>
      <ul>
        <li>You must be at least 13 years old and meet the minimum age of each platform you connect.</li>
        <li>
          You may only connect accounts, Pages and business assets you own or are authorized to manage, and you must be allowed to grant us read access to them.
        </li>
      </ul>

      <h2>Your account</h2>
      <ul>
        <li>Keep access to your email and sign-in methods safe. You are responsible for activity under your account.</li>
        <li>You can disconnect platforms or delete your account at any time in Settings.</li>
      </ul>

      <h2>Connected platforms</h2>
      <p>Your use of each platform stays subject to that platform&apos;s own terms and policies, which also apply when you connect it to {APP_NAME}:</p>
      <ul>
        <li>
          <a href="https://www.youtube.com/t/terms" {...ext}>
            YouTube Terms of Service
          </a>{" "}
          and the{" "}
          <a href="https://policies.google.com/privacy" {...ext}>
            Google Privacy Policy
          </a>
        </li>
        <li>
          <a href="https://www.facebook.com/terms" {...ext}>
            Meta Terms of Service
          </a>{" "}
          and the{" "}
          <a href="https://help.instagram.com/581066165581870" {...ext}>
            Instagram Terms of Use
          </a>
        </li>
        <li>
          <a href="https://www.tiktok.com/legal/terms-of-service" {...ext}>
            TikTok Terms of Service
          </a>
        </li>
        <li>
          <a href="https://www.linkedin.com/legal/user-agreement" {...ext}>
            LinkedIn User Agreement
          </a>
        </li>
      </ul>
      <p>
        Platforms can limit, change or end our access at any time, for example by changing their APIs or permissions. When that happens a connection can stop updating until you
        reconnect it, or a platform may become unavailable in {APP_NAME}.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t misuse the service: no attempts to access other people&apos;s accounts or data, to overload or disrupt the service, to scrape it, or to work around platform limits or
        our own.
      </p>

      <h2>Accuracy</h2>
      <p>
        Numbers come from the platforms and can be delayed, sampled or revised by them. Statistics refresh about once a day, and some history only starts on the day you connect. We
        show the numbers as provided and can&apos;t guarantee they are complete or error-free, so don&apos;t rely on them alone for financial or business decisions.
      </p>

      <h2>Availability and changes</h2>
      <p>
        We may change, pause or stop features or the service. We&apos;ll update these terms when that affects you, note the date above and, for significant changes, tell you by
        email.
      </p>

      <h2>Ending your use</h2>
      <p>
        You can delete your account at any time. We may suspend or close accounts that break these terms or a platform&apos;s terms. When an account is closed, its data is
        deleted as described in our <a href="/privacy">privacy policy</a>.
      </p>

      <h2>Liability</h2>
      <p>
        The service is provided as is and as available, without warranties, to the extent the law allows. To the extent the law allows, we are not liable for indirect or
        consequential losses, or for losses caused by the platforms you connect.
      </p>

      <h2>Contact</h2>
      <p>Questions about these terms: {LEGAL_CONTACT}</p>
    </>
  );
}
