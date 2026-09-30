"use client";

import type { ForecastRunResult } from "@/lib/forecast/types";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export function ForecastHydrographs({ result }: { result: ForecastRunResult }) {
  return (
    <section aria-label="Illustrative gauge hydrographs" className="space-y-2 p-3 pt-2">
      <div>
        <h2 className="text-xs font-semibold text-slate-900">Gauge flow comparison</h2>
        <p className="mt-0.5 text-[10px] leading-snug text-slate-600">
          {result.condition[0].toUpperCase() + result.condition.slice(1)} baseline vs. release scenario · cfs
        </p>
      </div>
      {result.hydrographs.map((gauge) => (
        <article key={gauge.gaugeId} className="rounded-lg border border-slate-200 bg-white p-2">
          <h3 className="text-[11px] font-semibold text-slate-800">
            {gauge.name} <span className="font-normal text-slate-500">({gauge.station})</span>
          </h3>
          <div className="mt-1 h-36 w-full min-w-0" role="img" aria-label={`${gauge.name} baseline and scenario flow hydrograph`}>
            <ResponsiveContainer width="100%" height="100%" minWidth={180}>
              <LineChart data={gauge.hydrograph} margin={{ top: 4, right: 5, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="step" tick={{ fontSize: 8 }} interval={1} />
                <YAxis tick={{ fontSize: 8 }} width={38} />
                <Tooltip
                  formatter={(value, name) => [
                    typeof value === "number" ? `${value.toFixed(1)} cfs` : String(value),
                    name === "baselineCfs" ? "Baseline" : "Scenario",
                  ]}
                  labelFormatter={(label) => String(label)}
                />
                <Legend
                  verticalAlign="top"
                  height={22}
                  wrapperStyle={{ fontSize: 9 }}
                  formatter={(value) => value === "baselineCfs" ? "Baseline" : "Scenario"}
                />
                <Line type="monotone" dataKey="baselineCfs" name="baselineCfs" stroke="#64748b" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="scenarioCfs" name="scenarioCfs" stroke="#176b7c" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>
      ))}
      <p className="rounded-md bg-amber-50 px-2 py-1.5 text-[9px] leading-snug text-amber-900">
        Demo only: all baselines reuse the bundled USGS fixture trace, scaled to the selected sample percentile. Gauge-specific release factors and timing are uncalibrated placeholders. This is not observed gauge data or a DHSVM forecast.
      </p>
    </section>
  );
}
