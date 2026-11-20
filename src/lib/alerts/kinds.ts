/**
 * Every kind of notification, in one place: the database columns, the alert
 * rules, Settings and the bell's icons all take their kinds from here.
 * No imports, so the database schema can use it too.
 */

/** Alerts people can switch on or off in Settings. */
export const ALERT_KINDS = ["spike", "milestone", "drop", "reconnect"] as const;
export type AlertKind = (typeof ALERT_KINDS)[number];

/** Everything that can appear in the inbox: the alerts, plus the weekly report. */
export type NotificationKind = AlertKind | "report";
