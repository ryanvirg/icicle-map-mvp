"use client";

import { FLOW_TARGETS, LONG_TERM_GOAL_CFS } from "@/data/flow-targets";
import type { RoutedChannelFlow } from "@/lib/routing";

type Props = {
  primary: RoutedChannelFlow;
  primaryLabel: string;
  compare?: RoutedChannelFlow;
  compareLabel?: string;
  caption?: string;
};

const TARGET_LINES = [
  ...FLOW_TARGETS.map((t) => ({ value: t.value, color: t.color, label: String(t.value) })),
  { value: LONG_TERM_GOAL_CFS, color: "#6366f1", label: "250" },
];

function buildRows(primary: RoutedChannelFlow, compare?: RoutedChannelFlow) {
  const dates = new Set(primary.center.map((p) => p.date));
  if (compare) compare.center.forEach((p) => dates.add(p.date));
  return [...dates].sort().map((date) => ({
    date,
    primary: primary.center.find((p) => p.date === date)?.value ?? 0,
    low: primary.lower.find((p) => p.date === date)?.value ?? 0,
    high: primary.upper.find((p) => p.date === date)?.value ?? 0,
    compare: compare?.center.find((p) => p.date === date)?.value,
  }));
}

export function HistoricalChannelChart({
  primary,
  primaryLabel,
  compare,
  compareLabel,
  caption,
}: Props) {
  const rows = buildRows(primary, compare);
  const sample = rows.filter((_, i) => i % 7 === 0);
  const peak = Math.max(
    ...sample.map((r) => Math.max(r.high, r.primary, r.compare ?? 0)),
  );
  const yMax = Math.max(peak + 25, 120, LONG_TERM_GOAL_CFS);
  const yMin = 0;
  const w = 340;
  const h = 200;
  const pad = { l: 36, r: 8, t: 12, b: 22 };

  const x = (i: number) =>
    pad.l + (i / Math.max(sample.length - 1, 1)) * (w - pad.l - pad.r);
  const y = (v: number) =>
    pad.t + (1 - (v - yMin) / (yMax - yMin)) * (h - pad.t - pad.b);

  const bandPath = sample
    .map((r, i) => `${i === 0 ? "M" : "L"} ${x(i)} ${y(r.high)}`)
    .join(" ");
  const bandLow = [...sample]
    .reverse()
    .map((r, i) => `L ${x(sample.length - 1 - i)} ${y(r.low)}`)
    .join(" ");
  const linePath = (key: "primary" | "compare") =>
    sample
      .map((r, i) => {
        const v = r[key];
        if (v == null) return "";
        return `${i === 0 ? "M" : "L"} ${x(i)} ${y(v)}`;
      })
      .filter(Boolean)
      .join(" ");

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">
        Historical Channel — routed flow vs targets
      </h3>
      {caption && <p className="mt-1 text-xs text-slate-600">{caption}</p>}
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="mt-2 w-full max-w-full"
        role="img"
        aria-label="Historical Channel hydrograph"
      >
        <rect x={0} y={0} width={w} height={h} fill="#fafafa" />
        {TARGET_LINES.map((t) => (
          <g key={t.label}>
            <line
              x1={pad.l}
              x2={w - pad.r}
              y1={y(t.value)}
              y2={y(t.value)}
              stroke={t.color}
              strokeDasharray="5 4"
              strokeWidth={1.2}
            />
            <text
              x={w - pad.r - 2}
              y={y(t.value) - 3}
              textAnchor="end"
              fontSize={8}
              fill={t.color}
            >
              {t.label}
            </text>
          </g>
        ))}
        <path d={`${bandPath} ${bandLow} Z`} fill="#c4b5fd" fillOpacity={0.35} />
        <path
          d={linePath("primary")}
          fill="none"
          stroke="#7c3aed"
          strokeWidth={2}
        />
        {compare && (
          <path
            d={linePath("compare")}
            fill="none"
            stroke="#0d9488"
            strokeWidth={2}
            strokeDasharray="6 3"
          />
        )}
        {sample.map((r, i) =>
          i % 2 === 0 ? (
            <text
              key={r.date}
              x={x(i)}
              y={h - 4}
              textAnchor="middle"
              fontSize={7}
              fill="#64748b"
            >
              {r.date.slice(5)}
            </text>
          ) : null,
        )}
        <text x={4} y={12} fontSize={8} fill="#64748b">cfs</text>
      </svg>
      <div className="mt-1 flex flex-wrap gap-3 text-[10px] text-slate-600">
        <span className="inline-flex items-center gap-1">
          <span className="h-0.5 w-3 bg-violet-600" /> {primaryLabel}
        </span>
        {compare && (
          <span className="inline-flex items-center gap-1">
            <span className="h-0.5 w-3 border-t-2 border-dashed border-teal-600" />
            {compareLabel ?? "Compare"}
          </span>
        )}
        <span className="inline-flex items-center gap-1">
          <span className="h-2 w-3 bg-violet-200" /> Uncertainty band
        </span>
      </div>
    </div>
  );
}
