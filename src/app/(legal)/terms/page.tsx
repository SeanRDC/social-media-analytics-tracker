import type { Metadata } from "next";
import s from "@/components/legal/Legal.module.css";
import { TermsText } from "@/components/legal/TermsText";
import { LEGAL_UPDATED } from "@/lib/brand";

export const metadata: Metadata = { title: "Terms of service" };

export default function TermsPage() {
  return (
    <article className={`${s.doc} card reveal`}>
      <h1>Terms of service</h1>
      <p className={s.meta}>Last updated {LEGAL_UPDATED}</p>

      <TermsText />
    </article>
  );
}
