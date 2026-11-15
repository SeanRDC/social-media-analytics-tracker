import type { Metadata } from "next";
import s from "@/components/legal/Legal.module.css";
import { APP_NAME, LEGAL_CONTACT, LEGAL_UPDATED } from "@/lib/brand";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <article className={`${s.doc} glass rim reveal`}>
      <h1>Terms of service</h1>
      <p className={s.meta}>Last updated {LEGAL_UPDATED}</p>
      <p className={s.draft}>Draft for review. Have this checked for your jurisdiction before launch.</p>

      <h2>Using {APP_NAME}</h2>
      <p>{APP_NAME} lets you view analytics for social media accounts you own or manage. You must be allowed to grant us access to every account you connect.</p>

      <h2>Your accounts</h2>
      <ul>
        <li>Keep your sign-in details safe. You are responsible for activity under your account.</li>
        <li>You can disconnect platforms or close your account at any time.</li>
        <li>Your use of each connected platform stays subject to that platform&apos;s own terms, including the YouTube Terms of Service.</li>
      </ul>

      <h2>Acceptable use</h2>
      <p>Don&apos;t misuse the service: no attempts to access other people&apos;s data, overload the service, or work around platform limits.</p>

      <h2>Accuracy</h2>
      <p>Numbers come from the platforms and can be delayed or revised by them. We show them as provided and can&apos;t guarantee they are complete or error-free.</p>

      <h2>Availability and changes</h2>
      <p>We may change or pause features, including when a platform changes its API. We&apos;ll update these terms when that happens and note the date above.</p>

      <h2>Liability</h2>
      <p>The service is provided as is, to the extent the law allows.</p>

      <h2>Contact</h2>
      <p>{LEGAL_CONTACT}</p>
    </article>
  );
}
