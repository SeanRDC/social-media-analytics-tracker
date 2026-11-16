import type { Metadata } from "next";
import s from "@/components/legal/Legal.module.css";
import { APP_NAME, LEGAL_CONTACT, LEGAL_UPDATED } from "@/lib/brand";

export const metadata: Metadata = { title: "Delete your data" };

export default function DataDeletionPage() {
  return (
    <article className={`${s.doc} glass rim reveal`}>
      <h1>Delete your data</h1>
      <p className={s.meta}>Last updated {LEGAL_UPDATED}</p>

      <p>You can remove a single platform&apos;s data or everything we hold about you.</p>

      <h2>Remove one platform</h2>
      <ol>
        <li>Sign in to {APP_NAME} and open Settings.</li>
        <li>Under Connected accounts, choose Disconnect next to the platform and confirm.</li>
        <li>We delete that platform&apos;s access tokens immediately and its statistics within 30 days.</li>
      </ol>

      <h2>Delete everything</h2>
      <p>Signed in? Open Settings and choose Delete account. It revokes our access to every platform and deletes your account and all stored data immediately.</p>
      <p>Can&apos;t sign in? Ask us by email:</p>
      <ol>
        <li>Email {LEGAL_CONTACT} from the address you sign in with, with the subject &ldquo;Delete my data&rdquo;.</li>
        <li>We confirm the request and delete your account, connections and statistics within 30 days.</li>
      </ol>

      <h2>Revoke access from the platform side</h2>
      <p>You can also remove {APP_NAME} from the connected apps settings of Google (YouTube), Facebook, Instagram, TikTok or LinkedIn. We stop receiving data straight away; follow the steps above to remove what we already stored.</p>
    </article>
  );
}
