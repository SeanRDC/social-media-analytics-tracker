import Link from "next/link";
import { Icon } from "@/components/icons/Icon";
import s from "./NoData.module.css";

/** Shown on data pages until one of the person's platforms has been imported. */
export function NoData() {
  return (
    <section className={`${s.card} card reveal`} aria-labelledby="no-data-h">
      <span className={`badges ${s.badges}`} aria-hidden="true">
        <span className={`badge-round ${s.b1}`}>
          <Icon name="link" size={24} />
        </span>
        <span className={`badge-round ${s.b2}`}>
          <Icon name="chart" size={24} />
        </span>
      </span>
      <h2 id="no-data-h" className={s.h}>
        Connect a platform to see your numbers
      </h2>
      <p className={s.p}>Your followers, views and best posts appear here after your first import. It takes about a minute per platform.</p>
      <Link href="/onboarding/connect" className={s.cta}>
        Connect platforms
        <span aria-hidden="true">
          <Icon name="arrow" size={15} strokeWidth={2} />
        </span>
      </Link>
    </section>
  );
}
