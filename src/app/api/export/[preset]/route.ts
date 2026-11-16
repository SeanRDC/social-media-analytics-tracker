import { getReportData } from "@/lib/data/api";
import { buildReport, isPreset, reportFilename, toCsv } from "@/lib/reports/build";

/** CSV download of a report preset for the signed-in user (signed-out visitors are sent to sign-in). */
export async function GET(_request: Request, ctx: RouteContext<"/api/export/[preset]">) {
  const { preset } = await ctx.params;
  if (!isPreset(preset)) return new Response("Unknown report", { status: 404 });
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
