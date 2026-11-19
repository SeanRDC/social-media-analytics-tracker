import type { Metadata } from "next";
import s from "@/components/legal/Legal.module.css";
import { PrivacyText } from "@/components/legal/PrivacyText";
import { LEGAL_UPDATED } from "@/lib/brand";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <article className={`${s.doc} card reveal`}>
      <h1>Privacy policy</h1>
      <p className={s.meta}>Last updated {LEGAL_UPDATED}</p>
      <p className={s.draft}>Draft for review. Have this checked for your jurisdiction before launch.</p>

      <PrivacyText />
    </article>
  );
}
