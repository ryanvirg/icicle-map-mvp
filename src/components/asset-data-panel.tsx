"use client";

import type { WatershedMapFeature } from "@/data/creeks";
import type { DailySeries } from "@/data/hydrology";
import { getIllustrativeLakeLevels } from "@/data/lake-water-levels";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type DataSource = "usgs_live" | "fixture";

type StreamflowPayload = {
  dataAsOf: string;
  fallbackReason?: string;
  name: string;
  series: DailySeries;
  source: DataSource;
};

type Props = {
  feature: WatershedMapFeature | null;
  onClose: () => void;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isDailySeries(value: unknown): value is DailySeries {
  return (
    Array.isArray(value) &&
    value.every(
      (point: unknown) =>
        isRecord(point) &&
        typeof point.date === "string" &&
        typeof point.value === "number" &&
        Number.isFinite(point.value),
    )
  );
}

function isStreamflowPayload(value: unknown): value is StreamflowPayload {
  if (!isRecord(value)) return false;

  return (
    typeof value.name === "string" &&
    typeof value.dataAsOf === "string" &&
    (value.source === "usgs_live" || value.source === "fixture") &&
    isDailySeries(value.series) &&
    (value.fallbackReason === undefined ||
      typeof value.fallbackReason === "string")
  );
}

function EmptyDataMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 text-center text-sm text-slate-600">
      {children}
    </div>
  );
}

export function AssetDataPanel({ feature, onClose }: Props) {
  const isIcicleCreek =
    feature?.kind === "creek" &&
    feature.name.trim().toLowerCase() === "icicle creek";
  const [streamflow, setStreamflow] = useState<StreamflowPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lakeLevels = useMemo(
    () =>
      feature?.kind === "lake" ? getIllustrativeLakeLevels(feature) : [],
    [feature],
  );

  useEffect(() => {
    if (!isIcicleCreek) {
      setStreamflow(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setStreamflow(null);
    setError(null);
    setLoading(true);

    fetch("/api/usgs/12458000", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`Streamflow request failed (${response.status}).`);
        }
        const payload: unknown = await response.json();
        if (!isStreamflowPayload(payload)) {
          throw new Error("The streamflow service returned invalid data.");
        }
        setStreamflow(payload);
      })
      .catch((requestError: unknown) => {
        if (controller.signal.aborted) return;
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load streamflow data.",
        );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [isIcicleCreek]);

  return (
    <section
      aria-label="Selected asset data"
      className="absolute bottom-3 left-1/2 z-20 w-[calc(100%-1.5rem)] max-w-3xl -translate-x-1/2 overflow-y-auto rounded-2xl border border-[#176b7c]/75 bg-white/45 px-3 pb-2 pt-2 shadow-[0_12px_36px_rgba(15,23,42,0.16)] backdrop-blur-lg sm:px-4"
      style={{ height: "clamp(180px, 25dvh, 220px)" }}
    >
      <div className="mx-auto w-full">
        <div className="mb-1.5 flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Data
            </p>
            <h2 className="text-base font-semibold text-slate-900">
              {feature?.name ?? "Select a map feature"}
            </h2>
            {feature && (
              <p className="mt-0.5 text-xs text-slate-500">
                {feature.kind === "creek" ? "Creek" : "Lake"}
                {feature.lengthKm !== undefined &&
                  ` · ${feature.lengthKm.toFixed(1)} km mapped`}
                {feature.areaKm2 !== undefined &&
                  ` · ${feature.areaKm2.toFixed(2)} km² mapped`}
              </p>
            )}
          </div>
          {feature && (
            <button
              type="button"
              aria-label="Clear selected map feature"
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            >
              <X size={18} aria-hidden />
            </button>
          )}
        </div>

        {!feature ? (
          <p className="text-sm text-slate-600">
            Click a lake or creek on the map to see its available data.
          </p>
        ) : feature.kind === "lake" ? (
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
            <div>
              <h3 className="mb-1 text-xs font-medium text-slate-700">
                Monthly lake water level (ft)
              </h3>
              <div className="h-28 min-w-0 rounded-lg border border-[#176b7c]/20 bg-white/25 p-1">
                <ResponsiveContainer width="100%" height="100%" minWidth={160}>
                  <LineChart
                    data={lakeLevels}
                    margin={{ top: 4, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbe4ec" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 9 }}
                      tickFormatter={(date: string) =>
                        date.endsWith("-01") || date.endsWith("-07")
                          ? new Date(`${date}-01T12:00:00Z`).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                year: "2-digit",
                                timeZone: "UTC",
                              },
                            )
                          : ""
                      }
                      minTickGap={10}
                    />
                    <YAxis
                      width={38}
                      tick={{ fontSize: 9 }}
                      tickFormatter={(value: number) => `${value} ft`}
                      domain={["dataMin - 1", "dataMax + 1"]}
                    />
                    <Tooltip
                      formatter={(value) => [
                        typeof value === "number"
                          ? `${value.toFixed(1)} ft`
                          : String(value),
                        "Illustrative level",
                      ]}
                      labelFormatter={(date) =>
                        new Date(`${date}-01T12:00:00Z`).toLocaleDateString(
                          "en-US",
                          {
                            month: "long",
                            year: "numeric",
                            timeZone: "UTC",
                          },
                        )
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      name="Illustrative water level"
                      stroke="#176b7c"
                      dot={false}
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
            <p className="max-w-44 text-[10px] leading-snug text-slate-600">
              <span className="font-semibold text-amber-800">
                Synthetic demo values
              </span>
              <br />
              Not measured elevations; arbitrary baseline. Checked USGS NWIS
              records did not provide daily lake-level series for these lakes.
            </p>
          </div>
        ) : feature.kind === "creek" ? (
          <div className="grid gap-3 md:grid-cols-[minmax(0,2fr)_minmax(180px,1fr)]">
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-800">
                {feature.name === "Icicle Creek"
                  ? "Recent streamflow"
                  : "Creek flow"}
              </h3>
              {loading ? (
                <EmptyDataMessage>Loading streamflow data…</EmptyDataMessage>
              ) : error ? (
                <EmptyDataMessage>{error}</EmptyDataMessage>
              ) : streamflow ? (
                <div className="h-32 min-w-0 rounded-lg border border-[#176b7c]/20 bg-white/25 p-1.5">
                  <ResponsiveContainer width="100%" height="100%" minWidth={160}>
                    <LineChart
                      data={streamflow.series}
                      margin={{ top: 8, right: 12, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(date: string) => date.slice(5)}
                      />
                      <YAxis
                        width={48}
                        tick={{ fontSize: 10 }}
                        unit=" cfs"
                      />
                      <Tooltip
                        formatter={(value) => [
                          typeof value === "number"
                            ? `${value.toFixed(1)} cfs`
                            : String(value),
                          "Flow",
                        ]}
                        labelFormatter={(date) => `Date: ${date}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="value"
                        name="Flow"
                        stroke="#176b7c"
                        dot={false}
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <EmptyDataMessage>
                  No streamflow series is connected for this creek yet.
                </EmptyDataMessage>
              )}
              {streamflow && (
                <p className="mt-1 text-[11px] text-slate-500">
                  {streamflow.source === "usgs_live"
                    ? `USGS 12458000 · live data · as of ${streamflow.dataAsOf}`
                    : `USGS 12458000 · illustrative fixture, not observed measurements · as of ${streamflow.dataAsOf}`}
                </p>
              )}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-slate-800">
                Water level
              </h3>
              <EmptyDataMessage>
                Water-level records are not connected yet.
              </EmptyDataMessage>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-600">
            Data for this map feature is not available in this view yet.
          </p>
        )}
      </div>
    </section>
  );
}
