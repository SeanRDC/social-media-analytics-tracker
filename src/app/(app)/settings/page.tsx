import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Icon } from "@/components/icons/Icon";
import { AlertSettings } from "@/components/settings/AlertSettings";
import { Connections } from "@/components/settings/Connections";
import { SignOutButton } from "@/components/settings/SignOutButton";
import s from "@/components/settings/Settings.module.css";
import { Avatar } from "@/components/ui/Avatar";
import { getConnections } from "@/lib/data/api";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Settings" };

const reveal = (i: number) => ({ "--i": i }) as CSSProperties;

export default async function SettingsPage() {
  const [user, connections] = await Promise.all([requireUser(), getConnections()]);
  return (
    <div className={s.grid}>
      <section className={`${s.card} ${s.profile} ${s.wide} glass rim reveal`} style={reveal(1)} aria-label="Profile">
        <Avatar size={56} />
        <div className={s.profileText}>
          <b>{user.name}</b>
          <small>{user.email}</small>
        </div>
        <SignOutButton />
      </section>

      <section className={`${s.card} glass rim reveal`} style={reveal(2)} aria-labelledby="conn-h">
        <h2 id="conn-h" className={s.h2}>
          Connected accounts
        </h2>
        <p className={s.lead}>We only read your stats. We never post for you.</p>
        <Connections initial={connections} />
      </section>

      <section id="alerts" className={`${s.card} glass rim reveal`} style={reveal(3)} aria-labelledby="alerts-h">
        <h2 id="alerts-h" className={s.h2}>
          Alerts
        </h2>
        <p className={s.lead}>Sent as push notifications on your phone and as email.</p>
        <AlertSettings />
      </section>

      <section className={`${s.card} ${s.wide} glass rim reveal`} style={reveal(4)} aria-labelledby="look-h">
        <h2 id="look-h" className={s.h2}>
          Appearance
        </h2>
        <div className={s.themes} role="radiogroup" aria-label="Theme">
          <span className={`${s.theme} ${s.themeOn}`} role="radio" aria-checked="true">
            <span className={s.swatch} style={{ background: "linear-gradient(135deg,#2b2f36,#16181c)" }} />
            Graphite
          </span>
          <span className={`${s.theme} ${s.themeOff}`} role="radio" aria-checked="false" aria-disabled="true">
            <span className={s.swatch} style={{ background: "linear-gradient(150deg,#e6eff9,#aac6ea)" }} />
            Light · coming later
          </span>
        </div>
        <p className={s.info}>
          <Icon name="sparkle" size={15} />
          <span>Motion and glass follow your device: turn on Reduce Motion or Reduce Transparency in your phone or computer settings and the app goes still and solid.</span>
        </p>
      </section>
    </div>
  );
}
