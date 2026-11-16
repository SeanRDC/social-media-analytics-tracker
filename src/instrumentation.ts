import type { Instrumentation } from "next";

/** Runs once when a server instance starts: check production settings. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const { checkProductionEnv } = await import("@/lib/env-check");
  const { logEvent } = await import("@/lib/log");
  const { errors, warnings } = checkProductionEnv(process.env);
  for (const message of errors) logEvent("error", "config_error", { message });
  for (const message of warnings) logEvent("warn", "config_warning", { message });
}

/** Every server error, as one structured log line (no request bodies, headers or user data). */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
  const { logEvent } = await import("@/lib/log");
  const e = err as { message?: string; digest?: string } | undefined;
  logEvent("error", "request_error", {
    method: request.method,
    // the path without the query string, which can carry personal data
    path: request.path.split("?")[0],
    route: context.routePath,
    routeType: context.routeType,
    message: e?.message?.slice(0, 300),
    digest: e?.digest,
  });
};
