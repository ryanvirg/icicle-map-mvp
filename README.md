# Icicle Creek — Watershed Map MVP

Full-screen interactive map of the Icicle Creek watershed. MapLibre renders the supplied `creeks_lakes.geojson` data from `src/data/creeks-lakes.json` directly above a muted basemap. Named creek lines and lake polygons use a consistent, restrained palette.

The map includes Data and Forecast modes. In Data mode, selecting a feature opens a compact, translucent bottom panel. Recent Icicle Creek flow uses the existing USGS endpoint; when live data is unavailable, the endpoint returns clearly labeled illustrative fixture values. The lake plots use synthetic monthly demo values in feet from 2020 through 2025: checked USGS NWIS lake records did not provide daily gage-height series for the mapped lakes. These synthetic values use an arbitrary baseline and are not observed elevations.

Forecast mode lets users choose Dry, Average, or Wet example flow classes, adjust the 0–50 cfs release slider for each mapped lake, and submit those inputs to a replaceable forecast-engine interface. The current template adapter maps the choices to P25/P50/P75 of eight points in the bundled USGS gage fixture and confirms the release settings; these are sample percentiles, not annual wet/average/dry classifications. The adapter does not run DHSVM or calculate downstream flows or lake levels, and slider ranges are unverified. Treat the workflow as a UI prototype, not an operational recommendation or forecast.

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

## Data-mode area overview

Data mode shows an accordion beneath the mode toggle for Streams, Land, Soil, Terrain, Climate, and Point sources. Area values summarize the full Icicle Creek watershed from documented public datasets; see the data notes below. Streams lists bundled creek features, and selecting one opens its existing data panel. Point sources remain unassessed. Forecast remains an illustrative release-control prototype, not a forecasting model.


## Area overview data

The area panel summarizes the six EPA HUC12 subwatersheds in the Icicle Creek HUC10 watershed (555.04 km²). EPA Watershed Index Online metrics are area-weighted across those six units; source rows, boundary geometry, and indicator definitions are bundled in `src/data/sources/icicle-area-source.json`. Land cover is NLCD 2019. Hydrologic soil groups use USDA NRCS gSSURGO (July 2020); the remainder is shown as unclassified rather than being assigned to a group. Terrain metrics are from the NHDPlus2 / USGS National Elevation Dataset snapshot; slope is in degrees.

Monthly climate normals are calculated from daily ERA5 1991–2020 temperature and precipitation, summarized by year and month, then weighted by the area where each roughly 25 km climate grid cell intersects the HUC10 boundary. These reanalysis estimates are not local station measurements and the grid cannot resolve mountain microclimates. Provenance and input cell weights are in `src/data/sources/icicle-area-provenance.json`. To refresh data, create a Python environment, install `scripts/area-data-requirements.txt`, then run `python scripts/build-area-data.py`.
