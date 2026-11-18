import Link from "next/link";
import s from "@/components/onboarding/Onboarding.module.css";

export default function NotFound() {
  return (
    <div className={s.page} style={{ justifyContent: "center" }}>
      <main className={`${s.card} card reveal`}>
        <span className={s.step}>Page not found</span>
        <h1 className={s.h1}>We couldn&apos;t find that page</h1>
        <p className={s.sub}>The link may be old, or the page may have moved. Your dashboard is one tap away.</p>
        <Link href="/overview" className={s.primary}>
          Go to your dashboard
        </Link>
      </main>
    </div>
  );
}
