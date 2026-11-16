import { getDb } from "@/db";
import { requireUser } from "@/lib/dal";
import { getReportData } from "@/lib/data/api";
import { hit, LIMITS } from "@/lib/rate-limit";
import { buildReport, isPreset, reportFilename, toCsv } from "@/lib/reports/build";

/** CSV download of a report preset for the signed-in user (signed-out visitors are sent to sign-in). */
export async function GET(_request: Request, ctx: RouteContext<"/api/export/[preset]">) {
  const { preset } = await ctx.params;
  if (!isPreset(preset)) return new Response("Unknown report", { status: 404 });
  const user = await requireUser();
  const limit = await hit(getDb(), `export:${user.id}`, LIMITS.export);
  if (!limit.ok) return new Response("Too many exports. Please try again later.", { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  const data = await getReportData();
  const report = buildReport(preset, data);
  return new Response(toCsv(report), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${reportFilename(report, data.asOf, "csv")}"`,
      // personal data: never cache in shared caches
      "Cache-Control": "private, no-store",
    },
  });
}
