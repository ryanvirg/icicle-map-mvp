# Icicle Creek — Watershed Map MVP

Map-first slice of the Icicle Strategy decision support path: watershed connectivity on the landing view, named scenarios (pre-run hydrology + date range + operating regime), Historical Channel comparison against 60 / 100 cfs guiding principles, and a summer release-volume statistic for two regimes that share the same hydrology and season window.

This is **not** the contracted Phase 1 season chart (`icicle-dashboard`). It demonstrates the next product slice described in the project plan (map front door, scenario metadata, routing-only edits).

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:4317](http://localhost:4317).

## Scripts

| Command        | Purpose                          |
| -------------- | -------------------------------- |
| `npm run dev`  | Dev server on port **4317**      |
| `npm run build`| Production build                 |
| `npm test`     | Target and routing unit tests    |

## Mocked / illustrative data

- **Hydrology library** — synthetic daily inflow and base channel flows keyed by `dhsvm-cal-2015-2024-avg` (not a live DHSVM run).
- **Scenarios** — two pre-loaded regimes: wilderness storage hold vs release for downstream need (Jul–Oct 2024 window).
- **Routing** — client-side recalculation when you copy/edit a regime; Structure 2 loss is an explicit uncertainty band.
- **USGS 12458000** — `/api/usgs/12458000` tries the USGS Water Services API and falls back to a **labeled fixture** when live data is unavailable.

## Out of scope (this repo)

Raster browsers, fish/recreation heat maps, optimizers, seasonal forecasts, auth, database, and claims of final visual design.

## References

- [Icicle Strategy](https://iciclestrategy.com/)
- [Phase 1 season app (WIP)](https://icicle-v030.azurewebsites.net/)
- [Okanagan FWMT scenario manager](https://www.ok.fwmt.net/Scenario/Manager)
