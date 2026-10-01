"use client";

import { useEffect, useState } from "react";
import { ChevronDown, CloudSun, Layers, Mountain, Trees, Waves, Factory } from "lucide-react";
import { AREA_DATA_CATEGORIES, AREA_SUMMARY } from "@/data/area-overview";
import { CREEK_REACHES, type WatershedMapFeature } from "@/data/creeks";
import { MAP_OVERLAYS, type MapOverlayId, defaultOverlayForCategory } from "@/data/map-overlays";
import { getIllustrativeStreamflow } from "@/data/illustrative-streamflow";

const icons = [Trees, Layers, Mountain, CloudSun, Factory];
const mappedLength = CREEK_REACHES.reduce((sum, creek) => sum + (creek.lengthKm ?? 0), 0);
const metricOverlays: Record<string, MapOverlayId> = {};

const rasterChoices: Record<"land" | "soil" | "terrain" | "climate", MapOverlayId[]> = {
  land: ["land-cover", "tree-canopy"],
  soil: ["soil-mapunits"],
  terrain: ["elevation", "slope"],
  climate: ["precipitation", "temperature"],
};

export function AreaDataPanel({ onSelectFeature, activeOverlay, onSelectOverlay }: {
  onSelectFeature: (feature: WatershedMapFeature) => void;
  activeOverlay: MapOverlayId | null;
  onSelectOverlay: (overlay: MapOverlayId | null) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>("streams");
  const [gaugeHistory, setGaugeHistory] = useState<{
    source: "usgs_live" | "fixture";
    series: { date: string; value: number }[];
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/usgs/12458000?years=1", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Gauge history unavailable");
        const data = await response.json();
        setGaugeHistory({ source: "usgs_live", series: data.series ?? [] });
      })
      .catch(() => {
        if (!controller.signal.aborted) setGaugeHistory({ source: "fixture", series: [] });
      });
    return () => controller.abort();
  }, []);
  const categories = [
    { id: "streams", title: "Streams", status: "Mapped features", Icon: Waves },
    ...AREA_DATA_CATEGORIES.map((category, index) => ({ ...category, Icon: icons[index] })),
  ];

  return (
    <section aria-label="Area soil and hydrology data">
      <div className="p-3">
        <h2 className="text-xs font-semibold text-slate-900">Area overview</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-500">
          Full Icicle Creek watershed · {AREA_SUMMARY.areaKm2.toFixed(1)} km²
        </p>
        <p className="mt-2 rounded-md bg-slate-50 p-2 text-[10px] leading-relaxed text-slate-600">
          HUC {AREA_SUMMARY.huc10} · {AREA_SUMMARY.subwatersheds.length} subwatersheds.
          Area summaries use the EPA watershed boundary snapshot. Stream totals describe only the mapped features.
        </p>
      </div>
      {categories.map(({ id, title, status, Icon }) => {
        const open = expanded === id;
        const category = AREA_DATA_CATEGORIES.find((item) => item.id === id);
        return (
          <div key={id} className="border-t border-slate-200">
            <h3>
              <button
                type="button"
                aria-expanded={open}
                aria-controls={`area-${id}`}
                id={`area-heading-${id}`}
                onClick={() => {
                  setExpanded(open ? null : id);
                  onSelectOverlay(defaultOverlayForCategory(id));
                }}
                className="flex w-full items-center gap-2 px-3 py-3 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#176b7c]"
              >
                <Icon size={15} className="shrink-0 text-[#176b7c]" aria-hidden />
                <span className="flex-1 text-xs font-semibold text-slate-800">{title}</span>
                <span className="text-[9px] text-slate-500">{activeOverlay && category?.id === MAP_OVERLAYS[activeOverlay].category ? "Mapped" : status}</span>
                <ChevronDown size={14} className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
              </button>
            </h3>
            <div id={`area-${id}`} role="region" aria-labelledby={`area-heading-${id}`} hidden={!open} className="px-3 pb-3">
              {id === "streams" ? (
                <>
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    <div className="rounded-lg bg-[#176b7c]/5 p-2">
                      <p className="text-lg font-semibold tabular-nums text-[#176b7c]">{CREEK_REACHES.length}</p>
                      <p className="text-[10px] text-slate-600">Mapped creek features</p>
                    </div>
                    <div className="rounded-lg bg-[#176b7c]/5 p-2">
                      <p className="text-lg font-semibold tabular-nums text-[#176b7c]">{mappedLength.toFixed(1)} <span className="text-xs">km</span></p>
                      <p className="text-[10px] text-slate-600">Mapped length · approx.</p>
                    </div>
                  </div>
                  <ul className="space-y-1">
                    {CREEK_REACHES.map((creek) => (
                      <li key={creek.id}>
                        <button type="button" onClick={() => onSelectFeature(creek)} className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left hover:border-[#176b7c]/50 hover:bg-slate-50">
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[11px] font-semibold text-slate-800">{creek.name}</span>
                            <span className="mt-0.5 block text-[9px] leading-snug text-slate-500">
                              {creek.name.trim().toLowerCase() === "icicle creek"
                                ? gaugeHistory?.source === "usgs_live" && gaugeHistory.series.length > 0
                                  ? `USGS 12458000 · latest daily mean ${gaugeHistory.series.at(-1)?.value.toFixed(0)} cfs · ${gaugeHistory.series.at(-1)?.date}`
                                  : gaugeHistory?.source === "fixture"
                                    ? "USGS history unavailable · chart uses labeled demo data"
                                    : "USGS 12458000 · loading daily flow history…"
                                : (() => {
                                    const values = getIllustrativeStreamflow(creek, 5).map((point) => point.value);
                                    return `Synthetic monthly flow · ${Math.min(...values).toFixed(0)}–${Math.max(...values).toFixed(0)} cfs · not measured`;
                                  })()}
                            </span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-[9px] text-slate-500">{creek.lengthKm?.toFixed(1)} km</span>
                            <span className="mt-0.5 block text-[9px] font-semibold text-[#176b7c]">View chart</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[10px] text-slate-500">Select a reach to open its 1-, 5-, or 10-year flow chart. Only Icicle Creek has a verified gauge connection.</p>
                  <p className="mt-2 text-[10px] text-slate-500">Source: bundled map geometry · Survey date not supplied.</p>
                </>
              ) : category ? (
                <>
                  <p className="mb-3 text-[11px] leading-relaxed text-slate-600">{category.description}</p>
                  {(id === "land" || id === "soil" || id === "terrain" || id === "climate") && (
                    <div className="mb-3">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                        {id === "climate" ? "Gridded climate maps" : id === "soil" ? "Detailed soil map" : "Detailed map layers"}
                      </p>
                      <div className="grid grid-cols-2 gap-1.5">
                        {rasterChoices[id].map((overlayId) => {
                          const overlay = MAP_OVERLAYS[overlayId];
                          const selected = overlayId === activeOverlay;
                          return (
                            <button
                              key={overlayId}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => onSelectOverlay(selected ? null : overlayId)}
                              className={`rounded-md border px-2 py-2 text-left text-[10px] font-medium leading-tight transition-colors ${selected ? "border-[#176b7c] bg-[#176b7c]/10 text-[#145866]" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"}`}
                            >
                              {overlay.label}
                              <span className="mt-0.5 block text-[9px] font-normal text-slate-500">
                                {overlay.resolution}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <dl className="divide-y divide-slate-100">
                    {category.metrics.map((metric) => (
                      <div key={metric.label} className="py-1.5 text-[11px]">
                        {metricOverlays[metric.label] ? (
                          <button type="button" aria-pressed={metricOverlays[metric.label] === activeOverlay} onClick={() => {
                            const overlay = metricOverlays[metric.label];
                            onSelectOverlay(activeOverlay === overlay ? null : overlay);
                          }} className="flex w-full flex-wrap justify-between gap-x-2 gap-y-1 rounded px-1 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-[#176b7c]">
                            <span className="text-slate-600">{metric.label}{metric.unit ? ` (${metric.unit})` : ""}</span>
                            <span className={`font-semibold tabular-nums ${metricOverlays[metric.label] === activeOverlay ? "text-amber-700" : "text-[#176b7c]"}`}>{metric.value === null ? "—" : metric.value.toLocaleString("en-US", { minimumFractionDigits: metric.unit === "ft" ? 0 : 1, maximumFractionDigits: metric.unit === "ft" ? 0 : 1 })}<span className="ml-1 text-[9px] font-normal text-slate-500">{metricOverlays[metric.label] === activeOverlay ? "Mapped" : "Map"}</span></span>
                          </button>
                        ) : <div className="flex flex-wrap justify-between gap-x-2 gap-y-1"><dt className="text-slate-600">{metric.label}{metric.unit ? ` (${metric.unit})` : ""}</dt><dd className="font-semibold tabular-nums text-[#176b7c]">{metric.value === null ? "—" : metric.value.toLocaleString("en-US", { minimumFractionDigits: metric.unit === "ft" ? 0 : 1, maximumFractionDigits: metric.unit === "ft" ? 0 : 1 })}</dd></div>}
                        {(id === "land" || id === "soil") && metric.value !== null && (
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100" aria-hidden>
                            <div className="h-full rounded-full bg-[#176b7c]/70" style={{ width: `${metric.value}%` }} />
                          </div>
                        )}
                      </div>
                    ))}
                  </dl>
                  {id === "climate" && (
                    <table className="mt-3 w-full text-left text-[10px] tabular-nums">
                      <caption className="mb-2 text-left font-semibold text-slate-700">Monthly averages · 1991–2020</caption>
                      <thead><tr className="border-b border-slate-200 text-slate-500"><th scope="col" className="pb-1">Month</th><th scope="col" className="pb-1 text-right">Precip. (in)</th><th scope="col" className="pb-1 text-right">Temp. (°F)</th></tr></thead>
                      <tbody>{AREA_SUMMARY.climate.months.map((month) => (
                        <tr key={month.month} className="border-b border-slate-100">
                          <th scope="row" className="py-1 font-normal text-slate-600">{month.month}</th>
                          <td className="py-1 text-right text-[#176b7c]">{month.precipitationIn.toFixed(1)}</td>
                          <td className="py-1 text-right text-slate-700">{month.temperatureF.toFixed(1)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  )}
                  {category.note && <p className="mt-3 text-[10px] leading-relaxed text-slate-500">{category.note}</p>}
                  <p className="mt-3 text-[10px] text-slate-500">
                    Source: {category.sourceUrl ? <a className="underline hover:text-[#176b7c]" href={category.sourceUrl} target="_blank" rel="noreferrer">{category.source}</a> : "Not connected"}
                    <br />Period: {category.period ?? "Not available"}
                    {category.source && <> · Retrieved {AREA_SUMMARY.retrievedAt.slice(0, 10)}</>}
                  </p>
                </>
              ) : null}
            </div>
          </div>
        );
      })}
    </section>
  );
}
