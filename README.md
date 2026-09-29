# Icicle Creek — Watershed Map MVP

Full-screen interactive map of the Icicle Creek watershed. MapLibre renders the supplied `creeks_lakes.geojson` data from `src/data/creeks-lakes.json` directly above a muted basemap. Named creek lines and lake polygons use a consistent, restrained palette.

The map includes Data and Scenario modes. In Data mode, selecting a feature opens a compact, translucent bottom panel. Recent Icicle Creek flow uses the existing USGS endpoint; when live data is unavailable, the endpoint returns clearly labeled illustrative fixture values. The lake plots use synthetic monthly demo values in feet from 2020 through 2025: checked USGS NWIS lake records did not provide daily gage-height series for the mapped lakes. These synthetic values use an arbitrary baseline and are not observed elevations.

Scenario mode provides a 0–50 cfs slider for each mapped lake and a combined slider-setting summary. These initial demo controls are not verified operating limits, do not change the data plots, and do not calculate downstream flows or lake levels. Treat them as a UI prototype, not an operational recommendation or forecast.

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

- **Feature labels** — creek and lake asset names are stored in each bundled GeoJSON feature's `properties.name` field.
- **Lake water levels** — monthly plotted values are deterministic synthetic demo data and are explicitly labeled as unmeasured.
- **Map tiles** — the basemap uses open CARTO raster tiles with OpenStreetMap attribution.

## Out of scope (this repo)

Raster browsers, fish/recreation heat maps, optimizers, seasonal forecasts, auth, database, and claims of final visual design.

## References

- [Icicle Strategy](https://iciclestrategy.com/)
- [Phase 1 season app (WIP)](https://icicle-v030.azurewebsites.net/)
- [Okanagan FWMT scenario manager](https://www.ok.fwmt.net/Scenario/Manager)
