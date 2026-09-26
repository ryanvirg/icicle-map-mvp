"use client";

import { FLOW_TARGETS, LONG_TERM_GOAL_CFS } from "@/data/flow-targets";
import type { DailySeries } from "@/data/hydrology";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = {
  title: string;
  caption?: string;
  center?: DailySeries;
  lower?: DailySeries;
  upper?: DailySeries;
  single?: DailySeries;
  showTargets?: boolean;
  emptyMessage?: string;
  loading?: boolean;
};

function mergeBand(
  center?: DailySeries,
  lower?: DailySeries,
  upper?: DailySeries,
  single?: DailySeries,
) {
  const dates = new Set<string>();
  for (const s of [center, lower, upper, single]) {
    s?.forEach((p) => dates.add(p.date));
  }
  return [...dates]
    .sort()
    .map((date) => ({
      date,
      center: center?.find((p) => p.date === date)?.value,
      lower: lower?.find((p) => p.date === date)?.value,
      upper: upper?.find((p) => p.date === date)?.value,
      value: single?.find((p) => p.date === date)?.value,
    }));
}

export function FlowChart({
  title,
  caption,
  center,
  lower,
  upper,
  single,
  showTargets,
  emptyMessage,
  loading,
}: Props) {
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-slate-200 bg-white text-sm text-slate-500">
        Loading series…
      </div>
    );
  }

  const data = mergeBand(center, lower, upper, single);
  if (data.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm text-slate-600">
        <p className="font-medium text-slate-800">{title}</p>
        <p>{emptyMessage ?? "No data for this selection."}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {caption && <p className="mt-1 text-xs text-slate-600">{caption}</p>}
      <div className="mt-2 h-56 w-full min-w-0" style={{ minHeight: 224 }}>
        <ResponsiveContainer width="100%" height={224} minWidth={180}>
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => v.slice(5)}
            />
            <YAxis tick={{ fontSize: 10 }} width={42} unit=" cfs" />
            <Tooltip
              formatter={(v) => [
                typeof v === "number" ? `${v.toFixed(1)} cfs` : String(v),
                "",
              ]}
              labelFormatter={(l) => `Date: ${l}`}
            />
            {showTargets &&
              FLOW_TARGETS.map((t) => (
                <ReferenceLine
                  key={t.id}
                  y={t.value}
                  stroke={t.color}
                  strokeDasharray="6 4"
                  label={{
                    value: `${t.value}`,
                    position: "insideTopRight",
                    fontSize: 10,
                    fill: t.color,
                  }}
                />
              ))}
            {showTargets && (
              <ReferenceLine
                y={LONG_TERM_GOAL_CFS}
                stroke="#6366f1"
                strokeDasharray="4 4"
                label={{
                  value: "250 long-term",
                  position: "insideTopLeft",
                  fontSize: 10,
                  fill: "#6366f1",
                }}
              />
            )}
            {single && (
              <Line
                type="monotone"
                dataKey="value"
                name="Series"
                stroke="#1d4ed8"
                dot={false}
                strokeWidth={2}
              />
            )}
            {center && (
              <Line
                type="monotone"
                dataKey="center"
                name="Routed (center)"
                stroke="#7c3aed"
                dot={false}
                strokeWidth={2}
                strokeDasharray="4 2"
              />
            )}
            {lower && (
              <Line
                type="monotone"
                dataKey="lower"
                name="Routed low"
                stroke="#a78bfa"
                dot={false}
                strokeWidth={1}
              />
            )}
            {upper && (
              <Line
                type="monotone"
                dataKey="upper"
                name="Routed high"
                stroke="#a78bfa"
                dot={false}
                strokeWidth={1}
              />
            )}
            <Legend wrapperStyle={{ fontSize: 11 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
