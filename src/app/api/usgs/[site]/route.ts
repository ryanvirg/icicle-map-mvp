import fixture from "@/data/fixtures/usgs-12458000.json";
import { NextResponse } from "next/server";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ site: string }> },
) {
  const { site } = await ctx.params;
  if (site !== "12458000") {
    return NextResponse.json({ error: "Site not in MVP scope" }, { status: 404 });
  }

  const url = new URL(req.url);
  const requestedYears = Number(url.searchParams.get("years") ?? "5");
  const years = [1, 5, 10].includes(requestedYears) ? requestedYears : 5;
  const end = new Date();
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - years);
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  const dailyUrl = new URL("https://api.waterdata.usgs.gov/ogcapi/v1/collections/daily/items");
  dailyUrl.search = new URLSearchParams({
    f: "json",
    monitoring_location_number: site,
    parameter_code: "00060",
    statistic_id: "00003",
    datetime: `${iso(start)}/${iso(end)}`,
    limit: "10000",
  }).toString();

  try {
    const res = await fetch(dailyUrl, {
      next: { revalidate: 21600 },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`USGS HTTP ${res.status}`);
    const data = await res.json();
    const series = data?.features?.map((feature: { properties?: Record<string, unknown> }) => ({
      date: String(feature.properties?.time ?? "").slice(0, 10),
      value: Number(feature.properties?.value),
    }));
    if (!Array.isArray(series) || series.length === 0) {
      throw new Error("Empty USGS series");
    }
    const parsed = series
      .filter((p: { date: string; value: number }) => p.date && Number.isFinite(p.value))
      .sort((left: { date: string }, right: { date: string }) => left.date.localeCompare(right.date));

    return NextResponse.json({
      site,
      name: fixture.name,
      years,
      dataAsOf: parsed.at(-1)?.date ?? iso(end),
      source: "usgs_live",
      series: parsed,
    });
  } catch {
    return NextResponse.json(
      { site, years, source: "unavailable", fallbackReason: "USGS daily values are unavailable right now." },
      { status: 503 },
    );
  }
}
