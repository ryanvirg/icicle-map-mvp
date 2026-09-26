import fixture from "@/data/fixtures/usgs-12458000.json";
import { NextResponse } from "next/server";

const USGS_IV =
  "https://waterservices.usgs.gov/nwis/iv/?format=json&sites={site}&parameterCd=00060&siteStatus=all";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ site: string }> },
) {
  const { site } = await ctx.params;
  if (site !== "12458000") {
    return NextResponse.json({ error: "Site not in MVP scope" }, { status: 404 });
  }

  try {
    const res = await fetch(USGS_IV.replace("{site}", site), {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`USGS HTTP ${res.status}`);
    const data = await res.json();
    const series = data?.value?.timeSeries?.[0]?.values?.[0]?.value;
    if (!Array.isArray(series) || series.length === 0) {
      throw new Error("Empty USGS series");
    }
    const parsed = series
      .slice(-45)
      .map((row: { dateTime: string; value: string }) => ({
        date: row.dateTime.slice(0, 10),
        value: Number(row.value),
      }))
      .filter((p: { value: number }) => Number.isFinite(p.value));

    return NextResponse.json({
      site,
      name: fixture.name,
      timezone: fixture.timezone,
      dataAsOf: new Date().toISOString().slice(0, 10),
      source: "usgs_live",
      series: parsed,
    });
  } catch {
    return NextResponse.json(
      {
        ...fixture,
        source: "fixture",
        fallbackReason:
          "Live USGS unavailable in this session; showing labeled fixture values.",
      },
      { status: 200 },
    );
  }
}
