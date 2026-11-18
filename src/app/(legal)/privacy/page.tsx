import type { Metadata } from "next";
import s from "@/components/legal/Legal.module.css";
import { APP_NAME, LEGAL_CONTACT, LEGAL_UPDATED } from "@/lib/brand";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <article className={`${s.doc} card reveal`}>
      <h1>Privacy policy</h1>
      <p className={s.meta}>Last updated {LEGAL_UPDATED}</p>
      <p className={s.draft}>Draft for review. Have this checked for your jurisdiction before launch.</p>

      <p>
        {APP_NAME} shows you analytics for the social media accounts you choose to connect. This policy explains what we collect, why, and how you stay in control.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>Your account details: name, email address and, if you use Google or Apple to sign in, the basic profile those services share.</li>
        <li>For each platform you connect: the account name and ID, access tokens the platform issues to us, and the statistics we are allowed to read, such as follower counts, views, engagement, post details and audience demographics.</li>
        <li>Basic technical data needed to run the service, such as sign-in sessions and error logs.</li>
      </ul>

      <h2>What we never do</h2>
      <ul>
        <li>We only request read-only access. We never post, comment, message or change anything on your accounts.</li>
        <li>We do not sell your data or use it for advertising.</li>
        <li>We do not use data from connected platforms to train AI models.</li>
      </ul>

      <h2>How we use your data</h2>
      <p>Only to show you your dashboard, compare your platforms, send the reports and alerts you turn on, and keep the service secure and working.</p>

      <h2>YouTube and Google data</h2>
      <p>
        {APP_NAME}&apos;s use and transfer of information received from Google APIs adheres to the{" "}
        <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noreferrer">
          Google API Services User Data Policy
        </a>
        , including the Limited Use requirements. When you connect YouTube you also agree to the{" "}
        <a href="https://www.youtube.com/t/terms" target="_blank" rel="noreferrer">
          YouTube Terms of Service
        </a>
        , and Google&apos;s privacy policy applies to Google&apos;s handling of your data:{" "}
        <a href="https://policies.google.com/privacy" target="_blank" rel="noreferrer">
          policies.google.com/privacy
        </a>
        . You can revoke our access at any time from your Google account&apos;s security settings.
      </p>

      <h2>How we protect it</h2>
      <p>Platform access tokens are encrypted before they are stored. Data is sent over HTTPS and stored with our hosting and database providers.</p>

      <h2>How long we keep it</h2>
      <p>While your account is open. When you disconnect a platform we delete its tokens immediately and its statistics within 30 days. When you delete your account we delete everything within 30 days.</p>

      <h2>Your choices</h2>
      <ul>
        <li>Disconnect any platform in Settings.</li>
        <li>
          Delete your data by following the steps on our <a href="/data-deletion">data deletion page</a>.
        </li>
        <li>Ask for a copy of your data or a correction by emailing {LEGAL_CONTACT}.</li>
      </ul>

      <h2>Contact</h2>
      <p>Questions about privacy: {LEGAL_CONTACT}</p>
    </article>
  );
}
