import { APP_NAME, LEGAL_CONTACT } from "@/lib/brand";
import { LINKEDIN_SCOPES, META_SCOPES, scopeName, TIKTOK_SCOPES, YOUTUBE_SCOPES } from "@/lib/connect/scopes";

/** "a, b and c": the permissions exactly as the login code requests them. */
const names = (scopes: string[]) => {
  const n = scopes.map(scopeName);
  return n.length > 1 ? `${n.slice(0, -1).join(", ")} and ${n[n.length - 1]}` : n[0];
};

const ext = { target: "_blank", rel: "noreferrer" } as const;

/** The Privacy Policy text, shared by /privacy and the agreement screen (/welcome). */
export function PrivacyText() {
  return (
    <>
      <p>
        {APP_NAME} (ispector.site) shows you analytics for the social media accounts you choose to connect. This policy explains what we collect, why, who helps us run the
        service, and how you stay in control.
      </p>

      <h2>What we collect</h2>
      <h3>Your account</h3>
      <ul>
        <li>Your name and email address. If you sign in with Google, the basic profile Google shares (name, email and profile picture).</li>
        <li>A profile photo, if you upload one.</li>
        <li>Sign-in sessions, including the IP address and browser they were started from, so we can keep your account secure.</li>
        <li>Your settings: alert preferences, report schedules and, if you turn them on, the browser push subscription used to deliver notifications.</li>
      </ul>

      <h3>The platforms you connect</h3>
      <p>For each platform you connect, we store the account&apos;s name and ID, the access tokens the platform issues to us, and the statistics we are allowed to read:</p>
      <ul>
        <li>
          <b>YouTube:</b> your channel&apos;s subscribers, views and watch time, your videos with their view, like and comment counts, and audience age, gender and country.
        </li>
        <li>
          <b>Facebook:</b> your Page&apos;s followers, daily follows and unfollows, views and engagement, and your Page posts with their reactions, comments, shares and views.
        </li>
        <li>
          <b>Instagram:</b> the Professional account linked to your Facebook Page: followers, your posts and reels with their likes, comments, views and shares, and follower age,
          gender and country (Instagram provides these for accounts with at least 100 followers).
        </li>
        <li>
          <b>TikTok:</b> your display name and username, follower, likes and video counts, and your recent videos with their view, like, comment and share counts.
        </li>
        <li>
          <b>LinkedIn:</b> the company Page you administer: followers, follower growth, impressions and engagement, and your Page posts with their statistics.
        </li>
      </ul>

      <h3>Technical data</h3>
      <p>Error logs needed to run and fix the service, and short-lived rate-limit records keyed by IP address. We keep access tokens and session tokens out of our logs.</p>

      <h2>Permissions we ask platforms for</h2>
      <p>We only ask for permissions to read the statistics above:</p>
      <ul>
        <li>Google / YouTube: {names(YOUTUBE_SCOPES)}.</li>
        <li>
          Facebook and Instagram (one Meta login serves both): {names(META_SCOPES)}. We use business_management only to find the Instagram account linked to a Page
          owned by a business portfolio.
        </li>
        <li>TikTok: {names(TIKTOK_SCOPES)}.</li>
        <li>LinkedIn: {names(LINKEDIN_SCOPES)}, which we use only to find the Pages you administer and read their statistics.</li>
      </ul>

      <h2>What we never do</h2>
      <ul>
        <li>We never post, comment, message, like or change anything on your accounts.</li>
        <li>We do not sell your data, share it with advertisers or use it for advertising.</li>
        <li>We do not use your data or data from connected platforms to train AI models.</li>
        <li>We do not show your data to other {APP_NAME} users.</li>
      </ul>

      <h2>How we use your data</h2>
      <p>
        Only to show you your dashboard, compare your platforms, send the sign-in links, reports and alerts you ask for, refresh your statistics once a day, and keep the service
        secure and working.
      </p>

      <h2>Who helps us run the service</h2>
      <p>These providers process data on our behalf, only to run {APP_NAME}:</p>
      <ul>
        <li>
          <b>Vercel</b> hosts the website and runs the app (in Singapore).
        </li>
        <li>
          <b>Neon</b> runs our database, hosted on Amazon Web Services in Singapore.
        </li>
        <li>
          <b>Resend</b> delivers our emails (sign-in links, reports and alerts).
        </li>
        <li>
          <b>Namecheap</b> forwards email sent to {LEGAL_CONTACT}.
        </li>
      </ul>
      <p>
        Your data is stored in Singapore. Some providers may process it in other countries, such as the United States, under their own data protection commitments. The platforms
        you connect (Google, Meta, TikTok and LinkedIn) remain responsible for their own handling of your data under their privacy policies.
      </p>

      <h2>Cookies</h2>
      <p>We use only the cookies needed to keep you signed in and to protect the connection process. We do not use advertising or analytics cookies.</p>

      <h2>Platform-specific terms</h2>
      <h3>YouTube and Google</h3>
      <p>
        {APP_NAME}&apos;s use and transfer of information received from Google APIs adheres to the{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" {...ext}>
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. By connecting YouTube you also agree to the{" "}
        <a href="https://www.youtube.com/t/terms" {...ext}>
          YouTube Terms of Service
        </a>
        , and the{" "}
        <a href="https://policies.google.com/privacy" {...ext}>
          Google Privacy Policy
        </a>{" "}
        applies to Google&apos;s handling of your data. You can revoke our access at any time at{" "}
        <a href="https://myaccount.google.com/permissions" {...ext}>
          myaccount.google.com/permissions
        </a>
        .
      </p>
      <h3>Facebook and Instagram</h3>
      <p>
        Data from Facebook and Instagram is received through Meta&apos;s APIs and handled under the{" "}
        <a href="https://developers.facebook.com/terms/" {...ext}>
          Meta Platform Terms
        </a>
        . You can remove {APP_NAME} in Facebook under Settings &amp; privacy, then Settings, then Business integrations.
      </p>
      <h3>TikTok</h3>
      <p>You can remove {APP_NAME} in the TikTok app under Settings and privacy, then Security and permissions, then Apps and services permissions.</p>
      <h3>LinkedIn</h3>
      <p>You can remove {APP_NAME} on LinkedIn under Settings, then Data privacy, then Permitted services.</p>

      <h2>How we protect it</h2>
      <p>
        Platform access tokens are encrypted (AES-256-GCM) before they are stored. All data is sent over HTTPS, the database requires encrypted connections, and only you can see
        your statistics.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Your account data, for as long as your account is open.</li>
        <li>
          When you disconnect a platform, we delete its tokens and statistics immediately. For YouTube, TikTok and LinkedIn we also ask the platform to revoke our access; for
          Facebook and Instagram, remove {APP_NAME} in Facebook&apos;s settings as described above.
        </li>
        <li>
          If you remove {APP_NAME} in a platform&apos;s own settings, or a platform stops giving us access and you don&apos;t reconnect it within 7 days, we delete that
          platform&apos;s tokens, statistics and posts. We tell you before this happens and when it is done.
        </li>
        <li>When you delete your account, we delete your account, connections, statistics, photo and settings immediately.</li>
        <li>Deleted data can remain for a short time in our database provider&apos;s automatic backups, and error logs are kept by our hosting provider for a short time.</li>
      </ul>

      <h2>Your rights and choices</h2>
      <ul>
        <li>Disconnect any platform in Settings, or remove {APP_NAME} from the platform&apos;s own settings as described above.</li>
        <li>
          Delete your account in Settings, or follow the steps on our <a href="/data-deletion">data deletion page</a>.
        </li>
        <li>
          Ask for a copy of your data, a correction, or to object to how we use it by emailing {LEGAL_CONTACT}. Depending on where you live (for example under the EU GDPR or the
          Philippine Data Privacy Act of 2012), you may have further rights, including complaining to your data protection authority. We reply within 30 days.
        </li>
      </ul>

      <h2>Children</h2>
      <p>{APP_NAME} is not meant for children under 13, and you must also meet the minimum age of each platform you connect.</p>

      <h2>Changes</h2>
      <p>If we change this policy we will update the date at the top. For significant changes to how we use your data, we will also tell you by email.</p>

      <h2>Contact</h2>
      <p>Questions or requests about privacy: {LEGAL_CONTACT}</p>
    </>
  );
}
