import { HYDROLOGY_LIBRARY } from "@/data/hydrology";

type Props = {
  hydrologyId?: string;
  usgsSource?: string;
};

export function SourcesBar({ hydrologyId, usgsSource }: Props) {
  const hydro = HYDROLOGY_LIBRARY.find((h) => h.id === hydrologyId);
  return (
    <aside
      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] text-slate-600"
      aria-label="Data sources"
    >
      <span className="font-semibold text-slate-800">Sources · </span>
      Hydrology library: {hydro?.label ?? "—"} (as of{" "}
      {hydro?.dataAsOf ?? "—"}). USGS 12458000:{" "}
      {usgsSource ?? "not loaded"}. Storage reference: April 2018 Alpine Lakes
      feasibility (May 2026 diagram). Targets: Icicle Strategy guiding
      principles JSON (100 / 60 / 20 cfs); 250 cfs shown separately.
    </aside>
  );
}
