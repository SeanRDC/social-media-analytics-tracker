import type { Metadata } from "next";
import type { CSSProperties } from "react";
import { Icon } from "@/components/icons/Icon";
import { AlertSettings } from "@/components/settings/AlertSettings";
import { Connections } from "@/components/settings/Connections";
import { SignOutButton } from "@/components/settings/SignOutButton";
import s from "@/components/settings/Settings.module.css";
import { AvatarEditor } from "@/components/settings/AvatarEditor";
import { deleteAvatar, uploadAvatar } from "@/app/actions/avatar";
import { disconnectPlatform } from "@/app/actions/connections";
import { importPlatform } from "@/app/actions/sync";
import { deleteAccount, updateName } from "@/app/actions/account";
import { ProfileName } from "@/components/settings/ProfileName";
import { setAlert, subscribePush, unsubscribePush } from "@/app/actions/alerts";
import { DeleteAccount } from "@/components/settings/DeleteAccount";
import { PushToggle } from "@/components/settings/PushToggle";
import { ThemePicker } from "@/components/settings/ThemePicker";
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
        <AvatarEditor name={user.name} src={user.image} onUpload={uploadAvatar} onRemove={deleteAvatar} />
        <div className={s.profileText}>
          <ProfileName name={user.name} onSave={updateName} />
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
        <ThemePicker />
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
