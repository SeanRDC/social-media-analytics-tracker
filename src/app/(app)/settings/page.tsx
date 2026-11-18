import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Icon } from "@/components/icons/Icon";
import { AlertSettings } from "@/components/settings/AlertSettings";
import { Connections } from "@/components/settings/Connections";
import { SignOutButton } from "@/components/settings/SignOutButton";
import s from "@/components/settings/Settings.module.css";
import { Avatar } from "@/components/ui/Avatar";
import { disconnectPlatform } from "@/app/actions/connections";
import { importPlatform } from "@/app/actions/sync";
import { deleteAccount } from "@/app/actions/account";
import { setAlert, subscribePush, unsubscribePush } from "@/app/actions/alerts";
import { DeleteAccount } from "@/components/settings/DeleteAccount";
import { PushToggle } from "@/components/settings/PushToggle";
import { getAlertSettings } from "@/lib/alerts/run";
import { vapidPublicKey } from "@/lib/push";
import { parseConnectResult } from "@/lib/connect/result";
import { getMyConnections } from "@/lib/data/connections";
import { requireUser } from "@/lib/dal";

export const metadata: Metadata = { title: "Settings" };

const reveal = (i: number) => ({ "--i": i }) as CSSProperties;

export default async function SettingsPage({ searchParams }: PageProps<"/settings">) {
  const [user, connections, params] = await Promise.all([requireUser(), getMyConnections(), searchParams]);
  const alerts = await getAlertSettings(user.id);
  const pushKey = vapidPublicKey();
  return (
    <div className={s.grid}>
      <section className={`${s.card} ${s.profile} ${s.wide} card reveal`} style={reveal(1)} aria-label="Profile">
        <Avatar size={56} />
        <div className={s.profileText}>
          <b>{user.name}</b>
          <small>{user.email}</small>
        </div>
        <SignOutButton />
      </section>

      <section className={`${s.card} card reveal`} style={reveal(2)} aria-labelledby="conn-h">
        <h2 id="conn-h" className={s.h2}>
          Connected accounts
        </h2>
        <p className={s.lead}>We only read your stats. We never post for you.</p>
        <Connections initial={connections} result={parseConnectResult(params)} onDisconnect={disconnectPlatform} onImport={importPlatform} />
      </section>

      <section id="alerts" className={`${s.card} card reveal`} style={reveal(3)} aria-labelledby="alerts-h">
        <h2 id="alerts-h" className={s.h2}>
          Alerts
        </h2>
        <p className={s.lead}>Sent by email{pushKey ? ", and as notifications on devices where you turn them on" : ""}. Checked once a day after your numbers update.</p>
        <AlertSettings initial={alerts} onChange={setAlert} />
        {pushKey && <PushToggle vapidPublicKey={pushKey} onSubscribe={subscribePush} onUnsubscribe={unsubscribePush} />}
      </section>

      <section className={`${s.card} ${s.wide} card reveal`} style={reveal(4)} aria-labelledby="look-h">
        <h2 id="look-h" className={s.h2}>
          Appearance
        </h2>
        <div className={s.themes} role="radiogroup" aria-label="Theme">
          <span className={`${s.theme} ${s.themeOn}`} role="radio" aria-checked="true">
            <span className={`${s.swatch} ${s.swatchLight}`} />
            Light
          </span>
          <span className={`${s.theme} ${s.themeOff}`} role="radio" aria-checked="false" aria-disabled="true">
            <span className={`${s.swatch} ${s.swatchDark}`} />
            Dark · coming later
          </span>
        </div>
        <p className={s.info}>
          <Icon name="sparkle" size={15} />
          <span>Motion follows your device: turn on Reduce Motion in your phone or computer settings and the app goes still.</span>
        </p>
      </section>
      <section className={`${s.card} ${s.wide} card reveal`} style={reveal(5)} aria-labelledby="delete-h">
        <h2 id="delete-h" className={s.h2}>
          Delete account
        </h2>
        <p className={s.lead}>Remove your account and everything we stored, right away.</p>
        <DeleteAccount email={user.email} onDelete={deleteAccount} />
      </section>
    </div>
  );
}
