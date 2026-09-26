"use client";

import type { Scenario } from "@/data/scenarios";
import {
  OPERATING_REGIMES,
  PRELOADED_SCENARIOS,
  copyScenarioWithRegime,
} from "@/data/scenarios";
import { HYDROLOGY_LIBRARY } from "@/data/hydrology";
import { Button } from "@/components/ui/button";

type Props = {
  scenarios: Scenario[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onScenariosChange: (next: Scenario[]) => void;
};

export function ScenarioPanel({
  scenarios,
  selectedId,
  onSelect,
  onScenariosChange,
}: Props) {
  const selected = scenarios.find((s) => s.id === selectedId) ?? null;

  function handleCopyEdit() {
    if (!selected) return;
    const flipped =
      selected.regime.id === "wilderness_hold"
        ? OPERATING_REGIMES.standard_release
        : OPERATING_REGIMES.wilderness_hold;
    const copy = copyScenarioWithRegime(
      selected,
      flipped,
      `Edited: ${flipped.label}`,
    );
    onScenariosChange([...scenarios, copy]);
    onSelect(copy.id);
  }

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Scenarios</h2>
          <p className="text-xs text-slate-600">
            Hydrology library id · date range · operating regime · readable
            description. Pre-loaded pair shares hydrology and dates.
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!selected}
          onClick={handleCopyEdit}
        >
          Copy &amp; edit regime
        </Button>
      </div>
      <ul className="space-y-2">
        {scenarios.map((s) => {
          const hydro = HYDROLOGY_LIBRARY.find((h) => h.id === s.hydrologyId);
          const active = s.id === selectedId;
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                className={`w-full rounded-md border px-3 py-2 text-left transition-colors ${
                  active
                    ? "border-[#1e3a5f] bg-[#1e3a5f]/5 ring-1 ring-[#1e3a5f]/30"
                    : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                <p className="text-sm font-medium text-slate-900">{s.name}</p>
                <p className="mt-1 text-xs text-slate-600">{s.description}</p>
                <dl className="mt-2 grid gap-1 text-[11px] text-slate-500 sm:grid-cols-2">
                  <div>
                    <dt className="font-medium text-slate-700">Hydrology</dt>
                    <dd>{hydro?.label ?? s.hydrologyId}</dd>
                  </div>
                  <div>
                    <dt className="font-medium text-slate-700">Dates</dt>
                    <dd>
                      {s.dateStart} → {s.dateEnd}
                    </dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="font-medium text-slate-700">Regime</dt>
                    <dd>{s.regime.label}</dd>
                  </div>
                </dl>
              </button>
            </li>
          );
        })}
      </ul>
      {scenarios.length === 0 && (
        <p className="text-sm text-slate-500">No scenarios loaded.</p>
      )}
      {scenarios === PRELOADED_SCENARIOS && (
        <p className="mt-2 text-[11px] text-slate-500">
          Copy edits routing only — DHSVM is never called from this view.
        </p>
      )}
    </section>
  );
}
