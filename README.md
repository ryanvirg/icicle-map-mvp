# Icicle Creek — Watershed Map MVP

Full-screen interactive map of the Icicle Creek watershed. MapLibre renders the supplied `creeks_lakes.geojson` data from `src/data/creeks-lakes.json` directly above a muted basemap. Named creek lines and lake polygons use a consistent, restrained palette.

The map includes Data and Forecast modes. In Data mode, selecting Icicle Creek opens a historical daily mean discharge chart from USGS site 12458000 with 1-, 5-, and 10-year ranges. Other mapped creek reaches show clearly labeled synthetic monthly example flows until station-to-reach relationships are verified. The lake plots use synthetic monthly demo values in feet from 2020 through 2025: checked USGS records did not provide daily gage-height series for the mapped lakes. These values use an arbitrary baseline and are not observed elevations.

Forecast mode lets users choose Dry, Average, or Wet example flow classes, adjust the 0–50 cfs release slider for each mapped lake, and run a replaceable forecast-engine interface. The current template adapter scales the eight-point USGS fixture trace to P25/P50/P75 and displays baseline-versus-scenario hydrographs at USGS 12458000, FWS Structure 2, and Ecology 45B070. These are sample percentiles, not annual wet/average/dry classifications. The same fixture baseline is reused at all three gauges; release routing factors and timing are uncalibrated display placeholders. The adapter does not run DHSVM or calculate observed downstream flows or lake levels, and slider ranges are unverified. Treat the workflow as a UI prototype, not an operational recommendation or forecast.

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

Raw-pixel inspection and analysis, fish/recreation heat maps, optimizers, seasonal forecasts, auth, database, and claims of final visual design.

## References

- [Icicle Strategy](https://iciclestrategy.com/)
- [Phase 1 season app (WIP)](https://icicle-v030.azurewebsites.net/)
- [Okanagan FWMT scenario manager](https://www.ok.fwmt.net/Scenario/Manager)

## Data-mode area overview

Data mode shows an accordion beneath the mode toggle for Streams, Land, Soil, Terrain, Climate, and Point sources. Area values summarize the full Icicle Creek watershed from documented public datasets; see the data notes below. Streams lists creek reaches with their flow-data source and opens a historical or clearly labeled illustrative series when selected. Point sources remain unassessed. Forecast remains an illustrative release-control prototype, not a forecasting model.


## Area overview data

The area panel summarizes the six EPA HUC12 subwatersheds in the Icicle Creek HUC10 watershed (555.04 km²). EPA Watershed Index Online metrics are area-weighted across those six units; source rows, boundary geometry, and indicator definitions are bundled in `src/data/sources/icicle-area-source.json`. The area summary still uses 2019 NLCD land cover. Separate, locally served map images show 2025 Annual NLCD land-cover classes and tree-canopy cover at 30 m. NRCS-derived SSURGO map units are rasterized to approximately 30 m cells by dominant hydrologic soil group (A, A/D, B, B/D, C, C/D, D, and not rated). HUC12 hydrologic soil-group percentages remain the older July 2020 summary. Terrain maps use USGS 3DEP at approximately 10 m ground resolution. Climate maps use PRISM 1991–2020 monthly normals aggregated to annual precipitation and annual mean temperature at approximately 4 km grid spacing. Watershed-specific quantile classes make differences legible within this wet mountain basin; values remain interpolated climate estimates, not station observations or forecasts. All new map images are clipped to the study boundary and served locally; the viewer does not request source data.

To rebuild the clipped land-cover, soil, terrain, and climate images, install `scripts/raster-overlay-requirements.txt` in a Python environment with `curl` available, then run `python scripts/build-raster-overlays.py`. The script downloads the source snapshots, clips/renders them to the bundled six-HUC12 boundary, writes images to `public/overlays/`, and records image bounds and source metadata in `src/data/sources/icicle-raster-overlay-metadata.json`. PRISM climate grids are aggregated from twelve monthly normals. The deployed app serves these static assets locally; raw source elevation and climate grids are intermediate files and are not bundled.

Monthly climate normals are calculated from daily ERA5 1991–2020 temperature and precipitation, summarized by year and month, then weighted by the area where each roughly 25 km climate grid cell intersects the HUC10 boundary. These reanalysis estimates are not local station measurements and the grid cannot resolve mountain microclimates. Provenance and input cell weights are in `src/data/sources/icicle-area-provenance.json`. To refresh data, create a Python environment, install `scripts/area-data-requirements.txt`, then run `python scripts/build-area-data.py`.

## Forecast map coloring path

The scenario hydrographs are still illustrative and do not calculate model status. When a DHSVM-backed engine and calibrated release routing are available, its output should be returned as time-series values keyed by stable lake and stream-reach IDs. A separate threshold configuration should define season- and feature-specific target ranges from accepted operating rules, permits, and ecological guidance. At a selected forecast time, a status step can classify each feature as within range, approaching a limit, outside range, or unknown; the map can then apply those statuses to ID-matched lake polygons and stream reaches and keep the map time synchronized with the hydrographs. Current map creek geometry is schematic, so real model reach IDs and geometries must be aligned before interpreting these colors operationally. Lake fills can indicate status; predicting changing lake shorelines would additionally require bathymetry or stage–area data.
