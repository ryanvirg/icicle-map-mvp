import type { MapOverlay } from "@/data/map-overlays";

export function MapOverlayLegend({
  overlay,
  onClear,
}: {
  overlay: MapOverlay;
  onClear: () => void;
}) {
  return (
    <section
      aria-label="Map legend"
      className="pointer-events-none absolute bottom-[calc(clamp(180px,25dvh,220px)+36px)] right-4 z-20 w-56 rounded-lg border border-slate-200 bg-white/95 p-3 shadow-md backdrop-blur-sm"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-xs font-semibold text-slate-800">
            {overlay.label}
          </h2>
          <a
            href={overlay.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="pointer-events-auto mt-0.5 block text-[10px] text-slate-500 underline hover:text-[#176b7c]"
          >
            {overlay.sourceLabel} · {overlay.period}
          </a>
          <p className="mt-0.5 text-[9px] text-slate-500">{overlay.resolution}</p>
        </div>
        <button
          type="button"
          className="pointer-events-auto -mt-1 -mr-1 rounded px-1 text-sm text-slate-500 hover:bg-slate-100"
          aria-label="Clear map overlay"
          onClick={onClear}
        >
          ×
        </button>
      </div>
      {overlay.legendItems ? (
        <div className="mt-2 grid grid-cols-2 gap-x-2 gap-y-1">
          {overlay.legendItems.map((item) => (
            <div key={item.label} className="flex items-center gap-1.5 text-[9px] leading-tight text-slate-600">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-sm border border-slate-300/70"
                style={{ backgroundColor: item.color }}
                aria-hidden
              />
              {item.label}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div
            className="mt-2 h-2 rounded"
            style={{ background: `linear-gradient(90deg, ${overlay.colors.join(", ")})` }}
            aria-hidden
          />
          <div className="mt-1 flex justify-between text-[9px] tabular-nums text-slate-600">
            <span>{overlay.min.toLocaleString()} {overlay.unit}</span>
            <span>{overlay.max.toLocaleString()} {overlay.unit}</span>
          </div>
        </>
      )}
      <p className="mt-2 text-[9px] leading-snug text-slate-600">{overlay.note}</p>
    </section>
  );
}
