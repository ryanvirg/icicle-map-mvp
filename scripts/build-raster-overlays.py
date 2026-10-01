"""Build locally served, clipped land, soil, terrain, and climate map images.

Requires scripts/raster-overlay-requirements.txt and curl. Network is used only
when this script is run; the app serves the generated PNGs from /public.
"""

from __future__ import annotations

import json
import math
import subprocess
import tempfile
import zipfile
from datetime import date
from pathlib import Path
from urllib.parse import urlencode

import numpy as np
import rasterio
from PIL import Image
from pyproj import Transformer
from rasterio.features import geometry_mask, rasterize
from rasterio.merge import merge
from rasterio.transform import from_bounds
from rasterio.warp import Resampling, reproject
from shapely.geometry import mapping, shape
from shapely.ops import transform as transform_geometry, unary_union


ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public" / "overlays"
METADATA_FILE = ROOT / "src" / "data" / "sources" / "icicle-raster-overlay-metadata.json"
BOUNDARY_FILE = ROOT / "src" / "data" / "sources" / "icicle-huc12-overlay.json"

NLCD_WMS = "https://dmsdata.cr.usgs.gov/geoserver/mrlc_Land-Cover-Native_conus_year_data/wms"
CANOPY_WMS = "https://dmsdata.cr.usgs.gov/geoserver/mrlc_NLCD-Tree-Canopy-Native_conus_year_data/wms"
DEM_EXPORT = "https://elevation.nationalmap.gov/arcgis/rest/services/3DEPElevation/ImageServer/exportImage"
SOIL_FEATURE_SERVICE = "https://services1.arcgis.com/gGHDlz6USftL5Pau/ArcGIS/rest/services/Soils_SSURGO/FeatureServer/0/query"
PRISM_ROOT = "https://data.prism.oregonstate.edu/normals/us/4km"


def curl_to_file(url: str, destination: Path) -> None:
    subprocess.run(
        ["curl", "--fail", "--location", "--silent", "--show-error", "--retry", "3", "--max-time", "900", url, "--output", str(destination)],
        check=True,
    )


def get_wms_image(service: str, layer: str, bbox: tuple[float, float, float, float], width: int, height: int, destination: Path) -> None:
    query = urlencode(
        {
            "service": "WMS",
            "version": "1.3.0",
            "request": "GetMap",
            "layers": layer,
            "styles": "",
            "crs": "EPSG:3857",
            "bbox": ",".join(f"{value:.4f}" for value in bbox),
            "width": width,
            "height": height,
            "format": "image/png",
            "transparent": "true",
            "time": "2025-01-01T00:00:00.000Z",
        }
    )
    curl_to_file(f"{service}?{query}", destination)


def download_ssurgo_mapunits(basin_4326, temp: Path):
    native_transform = Transformer.from_crs(4326, "ESRI:102039", always_xy=True)
    basin_native = transform_geometry(native_transform.transform, basin_4326)
    xmin, ymin, xmax, ymax = basin_native.bounds
    ids_path = temp / "ssurgo-mapunit-ids.json"
    ids_query = urlencode({
        "f": "json", "where": "1=1",
        "geometry": f"{xmin},{ymin},{xmax},{ymax}",
        "geometryType": "esriGeometryEnvelope", "inSR": "102039",
        "spatialRel": "esriSpatialRelIntersects", "returnIdsOnly": "true",
    })
    curl_to_file(f"{SOIL_FEATURE_SERVICE}?{ids_query}", ids_path)
    ids = json.loads(ids_path.read_text()).get("objectIds", [])
    if not ids:
        raise ValueError("NRCS-derived SSURGO service returned no map-unit features")

    data_path = temp / "ssurgo-mapunits.geojson"
    data_query = urlencode({
        "f": "geojson", "objectIds": ",".join(str(value) for value in ids),
        "outFields": "HydrolGrp_DCD,musym,muname,mukey", "outSR": "4326",
        "maxAllowableOffset": "0.00015", "geometryPrecision": "5",
        "returnGeometry": "true",
    })
    curl_to_file(f"{SOIL_FEATURE_SERVICE}?{data_query}", data_path)
    collection = json.loads(data_path.read_text())
    if not collection.get("features"):
        raise ValueError("NRCS-derived SSURGO query returned no geometries")
    return collection


def build_soil_hsg_raster(collection, path: Path, bbox, basin_3857, width: int, height: int):
    affine, basin_mask = reprojected_mask(basin_3857, bbox, width, height)
    codes = {"A": 1, "A/D": 2, "B": 3, "B/D": 4, "C": 5, "C/D": 6, "D": 7}
    categories = [
        ("A · high infiltration", "#24834a"), ("A/D · drained / undrained", "#85c9a5"),
        ("B · moderate-high infiltration", "#9abf36"), ("B/D · drained / undrained", "#71a6c7"),
        ("C · moderate-low infiltration", "#f1cb4b"), ("C/D · drained / undrained", "#b28acb"),
        ("D · low infiltration", "#e36a3d"), ("Not rated", "#a8adb4"),
    ]
    project = Transformer.from_crs(4326, 3857, always_xy=True)
    shapes = []
    skipped_geometries = 0
    for feature in collection["features"]:
        hsg = str(feature.get("properties", {}).get("HydrolGrp_DCD") or "").strip().upper()
        code = codes.get(hsg, 8)
        try:
            geometry = transform_geometry(project.transform, shape(feature["geometry"]))
        except (TypeError, ValueError):
            skipped_geometries += 1
            continue
        shapes.append((mapping(geometry), code))
    if skipped_geometries:
        print(f"Skipped {skipped_geometries} malformed SSURGO map-unit geometries", flush=True)
    if not shapes:
        raise ValueError("No valid SSURGO map-unit geometries could be rasterized")
    grid = rasterize(
        shapes, out_shape=(height, width), transform=affine,
        fill=0, dtype="uint8", all_touched=False,
    )
    color_by_code = np.zeros((9, 3), dtype="uint8")
    for code, (_, color) in enumerate(categories, 1):
        color_by_code[code] = tuple(bytes.fromhex(color.lstrip("#")))
    rgba = np.zeros((height, width, 4), dtype="uint8")
    rgba[..., :3] = color_by_code[grid]
    rgba[..., 3] = np.where((grid > 0) & basin_mask, 235, 0).astype("uint8")
    Image.fromarray(rgba).save(path, format="WEBP", quality=94, method=6)
    counts = np.bincount(grid[basin_mask].ravel(), minlength=9)
    total = counts[1:].sum()
    coverage = {
        label: round(float(counts[code] / total * 100), 1) if total else 0
        for code, (label, _) in enumerate(categories, 1)
    }
    return categories, coverage


def build_prism_annual_images(bbox, basin_3857, width, height, temp: Path):
    precip_total = None
    temperature_weighted = None
    day_total = 0
    grid_transform = None
    grid_crs = None
    for month in range(1, 13):
        days = [31, 28 + (1 if month == 2 else 0), 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
        period = f"2020{month:02d}"
        month_dir = temp / f"prism-{month:02d}"
        month_dir.mkdir()
        for variable in ("ppt", "tmean"):
            archive = month_dir / f"{variable}.zip"
            url = f"{PRISM_ROOT}/{variable}/monthly/prism_{variable}_us_25m_{period}_avg_30y.zip"
            curl_to_file(url, archive)
            with zipfile.ZipFile(archive) as zipped:
                tif_name = next(name for name in zipped.namelist() if name.endswith(".tif"))
                source_path = month_dir / f"{variable}.tif"
                source_path.write_bytes(zipped.read(tif_name))
            with rasterio.open(source_path) as source:
                if grid_transform is None:
                    grid_transform, grid_crs = source.transform, source.crs
                    precip_total = np.zeros((source.height, source.width), dtype="float32")
                    temperature_weighted = np.zeros_like(precip_total)
                values = source.read(1).astype("float32")
                nodata = source.nodata
                if nodata is not None:
                    values[values == nodata] = np.nan
                if variable == "ppt":
                    precip_total += np.nan_to_num(values, nan=0.0)
                else:
                    temperature_weighted += np.nan_to_num(values, nan=0.0) * days
        day_total += days
        print(f"Downloaded PRISM 1991–2020 normals month {month:02d}", flush=True)

    temperature_mean = temperature_weighted / day_total
    dst_transform = from_bounds(*bbox, width, height)
    basin_mask = basin_mask_for(basin_3857, bbox, width, height)
    projected = {}
    for name, values, resampling in (
        ("precipitation", precip_total, Resampling.nearest),
        ("temperature", temperature_mean, Resampling.nearest),
    ):
        destination = np.full((height, width), -9999, dtype="float32")
        reproject(
            source=values, destination=destination, src_transform=grid_transform,
            src_crs=grid_crs, src_nodata=-9999, dst_transform=dst_transform,
            dst_crs="EPSG:3857", dst_nodata=-9999, resampling=resampling,
        )
        valid = (destination != -9999) & np.isfinite(destination)
        if name == "precipitation":
            destination /= 25.4  # PRISM precipitation grids are in millimeters.
            palette = ["#f6e8a6", "#e7b95c", "#91b77a", "#3f9aa0", "#344b91"]
            unit = "in"
            result_key = "climatePrecipitation"
            path = PUBLIC / "prism-annual-precipitation.webp"
        else:
            palette = ["#3b4cc0", "#688aef", "#9abbff", "#f2d06b", "#d1492e"]
            unit = "°F"
            result_key = "climateTemperature"
            path = PUBLIC / "prism-annual-mean-temperature.webp"
        basin_values = destination[valid & basin_mask]
        if not basin_values.size:
            raise ValueError(f"No PRISM {name} cells overlap the study-area boundary")
        breaks = [round(float(value), 2) for value in np.quantile(basin_values, [0.2, 0.4, 0.6, 0.8])]
        indices = np.digitize(destination, breaks, right=False)
        colors = np.array([tuple(bytes.fromhex(color.lstrip("#"))) for color in palette], dtype="uint8")
        rgba = np.zeros((height, width, 4), dtype="uint8")
        rgba[..., :3] = colors[np.minimum(indices, len(colors) - 1)]
        rgba[..., 3] = np.where(valid & basin_mask, 238, 0).astype("uint8")
        Image.fromarray(rgba).save(path, format="WEBP", quality=93, method=6)
        edges = [float(np.min(basin_values)), *breaks, float(np.max(basin_values))]
        if name == "temperature":
            edges = [value * 9 / 5 + 32 for value in edges]
        labels = [f"{edges[index]:.1f}–{edges[index + 1]:.1f} {unit}" for index in range(len(palette))]
        legend_items = [{"label": label, "color": palette[index]} for index, label in enumerate(labels)]
        projected[result_key] = {
            "path": path,
            "min": round(float(np.min(basin_values)), 1),
            "max": round(float(np.max(basin_values)), 1),
            "breaks": breaks,
            "colors": palette,
            "legendItems": legend_items,
        }
    return projected


def basin_mask_for(basin_3857, bbox, width, height):
    return reprojected_mask(basin_3857, bbox, width, height)[1]


def download_dem_mosaic(bbox, width: int, height: int, destination: Path, temp: Path) -> None:
    pixel_x = (bbox[2] - bbox[0]) / width
    pixel_y = (bbox[3] - bbox[1]) / height
    windows = []
    tile_width = 1600
    tile_height = 1500
    for row_start in range(0, height, tile_height):
        row_end = min(row_start + tile_height, height)
        for col_start in range(0, width, tile_width):
            col_end = min(col_start + tile_width, width)
            tile_bbox = (
                bbox[0] + col_start * pixel_x,
                bbox[3] - row_end * pixel_y,
                bbox[0] + col_end * pixel_x,
                bbox[3] - row_start * pixel_y,
            )
            tile_path = temp / f"dem-{row_start}-{col_start}.tif"
            query = urlencode(
                {
                    "bbox": ",".join(f"{value:.4f}" for value in tile_bbox),
                    "bboxSR": 3857,
                    "imageSR": 3857,
                    "size": f"{col_end-col_start},{row_end-row_start}",
                    "format": "tiff",
                    "pixelType": "F32",
                    "f": "image",
                }
            )
            curl_to_file(f"{DEM_EXPORT}?{query}", tile_path)
            windows.append(tile_path)
            print(f"Downloaded 3DEP DEM window {len(windows)}", flush=True)

    sources = [rasterio.open(path) for path in windows]
    try:
        mosaic, mosaic_transform = merge(
            sources,
            bounds=bbox,
            res=(pixel_x, pixel_y),
            method="first",
        )
        profile = sources[0].profile.copy()
        profile.update(
            driver="GTiff",
            height=mosaic.shape[1],
            width=mosaic.shape[2],
            transform=mosaic_transform,
            count=1,
            dtype="float32",
            compress="deflate",
            predictor=3,
        )
        with rasterio.open(destination, "w", **profile) as output:
            output.write(mosaic[0].astype("float32"), 1)
    finally:
        for source in sources:
            source.close()


def reprojected_mask(basin_3857, bbox, width, height):
    transform = from_bounds(*bbox, width, height)
    mask = geometry_mask(
        [mapping(basin_3857)],
        out_shape=(height, width),
        transform=transform,
        invert=True,
        all_touched=False,
    )
    return transform, mask


def clip_rendered_image(path: Path, mask: np.ndarray) -> None:
    image = Image.open(path).convert("RGBA")
    if image.size != (mask.shape[1], mask.shape[0]):
        raise ValueError(f"Unexpected image size in {path}: {image.size}")
    rgba = np.asarray(image).copy()
    rgba[~mask, 3] = 0
    Image.fromarray(rgba).save(path, format="WEBP", quality=93, method=6)


def color_ramp(values: np.ndarray, stops: list[tuple[float, tuple[int, int, int]]]) -> np.ndarray:
    positions = np.array([stop[0] for stop in stops], dtype="float32")
    rgb = []
    for channel in range(3):
        colors = np.array([stop[1][channel] for stop in stops], dtype="float32")
        rgb.append(np.interp(values, positions, colors))
    return np.stack(rgb, axis=-1)


def build_terrain(dem_path: Path, relief_path: Path, slope_path: Path, bbox, basin_3857, width, height):
    affine, basin_mask = reprojected_mask(basin_3857, bbox, width, height)
    with rasterio.open(dem_path) as dataset:
        dem = dataset.read(1, masked=True).filled(np.nan).astype("float32")
        source_transform = dataset.transform
        source_crs = dataset.crs
        source_bounds = dataset.bounds
    if source_crs is None or source_crs.to_epsg() != 3857:
        raise ValueError(f"Expected a Web Mercator DEM, received {source_crs}")
    if not np.allclose(
        [source_bounds.left, source_bounds.bottom, source_bounds.right, source_bounds.top],
        bbox,
        atol=0.1,
    ):
        raise ValueError(f"DEM bounds do not match requested bounds: {source_bounds}")

    valid = basin_mask & np.isfinite(dem)
    elevations = dem[valid]
    if elevations.size == 0:
        raise ValueError("No DEM values overlap the study-area boundary")

    latitude_mid = Transformer.from_crs(3857, 4326, always_xy=True).transform(
        (bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2
    )[1]
    ground_pixel = abs(source_transform.a) * math.cos(math.radians(latitude_mid))
    dz_dy, dz_dx = np.gradient(dem, -ground_pixel, ground_pixel)
    slope = np.degrees(np.arctan(np.hypot(dz_dx, dz_dy))).astype("float32")
    aspect = np.arctan2(-dz_dx, -dz_dy)
    slope_radians = np.radians(slope)

    # Average four illumination directions to avoid a single artificial shadow direction.
    altitude = math.radians(45)
    hillshades = []
    for azimuth_degrees in (225, 270, 315, 360):
        azimuth = math.radians(azimuth_degrees)
        shade = (
            math.sin(altitude) * np.cos(slope_radians)
            + math.cos(altitude) * np.sin(slope_radians) * np.cos(azimuth - aspect)
        )
        hillshades.append(np.clip(shade, 0, 1))
    illumination = 0.62 + np.mean(hillshades, axis=0) * 0.38

    elevation_stops = [
        (350, (48, 91, 69)),
        (650, (91, 128, 75)),
        (1000, (151, 165, 98)),
        (1450, (201, 182, 126)),
        (1900, (172, 142, 113)),
        (2400, (182, 181, 171)),
        (3100, (244, 242, 232)),
    ]
    base_rgb = color_ramp(dem, elevation_stops)
    relief_rgb = np.clip(base_rgb * illumination[..., None], 0, 255).astype("uint8")

    relief_rgba = np.zeros((height, width, 4), dtype="uint8")
    relief_rgba[..., :3] = relief_rgb
    relief_rgba[..., 3] = np.where(valid, 255, 0).astype("uint8")
    Image.fromarray(relief_rgba).save(relief_path, format="WEBP", quality=93, method=6)

    slope_stops = [
        (0, (238, 242, 222)),
        (5, (204, 220, 159)),
        (15, (235, 215, 117)),
        (30, (218, 147, 83)),
        (50, (169, 73, 56)),
        (70, (103, 44, 51)),
    ]
    slope_rgb = color_ramp(slope, slope_stops).astype("uint8")
    slope_rgba = np.zeros((height, width, 4), dtype="uint8")
    slope_rgba[..., :3] = slope_rgb
    slope_rgba[..., 3] = np.where(valid, 220, 0).astype("uint8")
    Image.fromarray(slope_rgba).save(slope_path, format="WEBP", quality=93, method=6)

    return {
        "minElevationM": round(float(np.nanpercentile(elevations, 1)), 1),
        "maxElevationM": round(float(np.nanpercentile(elevations, 99)), 1),
        "actualMinElevationM": round(float(elevations.min()), 1),
        "actualMaxElevationM": round(float(elevations.max()), 1),
        "slopeP95Degrees": round(float(np.nanpercentile(slope[valid], 95)), 1),
    }


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    boundary = json.loads(BOUNDARY_FILE.read_text())
    basin_4326 = unary_union([shape(feature["geometry"]) for feature in boundary["features"]])
    project = Transformer.from_crs(4326, 3857, always_xy=True)
    unproject = Transformer.from_crs(3857, 4326, always_xy=True)
    basin_3857 = transform_geometry(project.transform, basin_4326)
    bbox = basin_3857.bounds
    width_m, height_m = bbox[2] - bbox[0], bbox[3] - bbox[1]
    center_lat = unproject.transform((bbox[0] + bbox[2]) / 2, (bbox[1] + bbox[3]) / 2)[1]
    mercator_scale = math.cos(math.radians(center_lat))

    # 30 m ground pixels for NLCD; the approximate map-projected pixel size is
    # larger at this latitude due to Web Mercator scale distortion.
    land_pixel_map_m = 30 / mercator_scale
    land_width = math.ceil(width_m / land_pixel_map_m)
    land_height = math.ceil(height_m / land_pixel_map_m)
    # 10 m ground pixels for the seamless 3DEP DEM visualization.
    terrain_pixel_map_m = 10 / mercator_scale
    terrain_width = math.ceil(width_m / terrain_pixel_map_m)
    terrain_height = math.ceil(height_m / terrain_pixel_map_m)

    with tempfile.TemporaryDirectory(prefix="icicle-raster-overlays-") as temp_name:
        temp = Path(temp_name)
        land_path = PUBLIC / "nlcd-2025-land-cover.webp"
        canopy_path = PUBLIC / "nlcd-2025-tree-canopy.webp"
        get_wms_image(
            NLCD_WMS,
            "Land-Cover-Native_conus_year_data",
            bbox,
            land_width,
            land_height,
            land_path,
        )
        get_wms_image(
            CANOPY_WMS,
            "NLCD-Tree-Canopy-Native_conus_year_data",
            bbox,
            land_width,
            land_height,
            canopy_path,
        )
        _, land_mask = reprojected_mask(basin_3857, bbox, land_width, land_height)
        clip_rendered_image(land_path, land_mask)
        clip_rendered_image(canopy_path, land_mask)

        soil_path = PUBLIC / "nrcs-ssurgo-hydrologic-groups.webp"
        soil_width = min(4096, land_width)
        soil_height = min(4096, land_height)
        soil_features = download_ssurgo_mapunits(basin_4326, temp)
        soil_categories, soil_coverage = build_soil_hsg_raster(
            soil_features, soil_path, bbox, basin_3857, soil_width, soil_height
        )

        climate = build_prism_annual_images(
            bbox,
            basin_3857,
            max(1, math.ceil(width_m / 4000)),
            max(1, math.ceil(height_m / 4000)),
            temp,
        )

        dem_path = temp / "icicle-3dep-dem.tif"
        download_dem_mosaic(bbox, terrain_width, terrain_height, dem_path, temp)
        relief_path = PUBLIC / "usgs-3dep-elevation-relief.webp"
        slope_path = PUBLIC / "usgs-3dep-slope.webp"
        terrain_summary = build_terrain(
            dem_path,
            relief_path,
            slope_path,
            bbox,
            basin_3857,
            terrain_width,
            terrain_height,
        )

    corners = [
        list(unproject.transform(bbox[0], bbox[3])),
        list(unproject.transform(bbox[2], bbox[3])),
        list(unproject.transform(bbox[2], bbox[1])),
        list(unproject.transform(bbox[0], bbox[1])),
    ]
    metadata = {
        "generatedAt": date.today().isoformat(),
        "studyArea": "Union of the six EPA WSIO HUC12 geometries already bundled with the app",
        "bboxEpsg3857": [round(v, 2) for v in bbox],
        "imageCoordinates": corners,
        "assets": {
            "landCover": {
                "url": "/overlays/nlcd-2025-land-cover.webp",
                "dataset": "USGS Annual NLCD Collection 1.2 Land Cover",
                "year": 2025,
                "groundResolutionMeters": 30,
                "representation": "Locally cached, clipped WMS-rendered raster image for display",
                "sourceUrl": "https://www.mrlc.gov/data/land-cover-conus-38",
                "attribution": "USGS / MRLC Annual NLCD 2025",
                "width": land_width,
                "height": land_height,
            },
            "treeCanopy": {
                "url": "/overlays/nlcd-2025-tree-canopy.webp",
                "dataset": "NLCD Tree Canopy Cover (USDA Forest Service / MRLC)",
                "year": 2025,
                "groundResolutionMeters": 30,
                "representation": "Locally cached, clipped WMS-rendered raster image for display",
                "sourceUrl": "https://www.mrlc.gov/data/nlcd-tree-canopy-cover",
                "attribution": "USDA Forest Service / USGS / MRLC, NLCD Tree Canopy Cover 2025",
                "width": land_width,
                "height": land_height,
            },
            "terrainRelief": {
                "url": "/overlays/usgs-3dep-elevation-relief.webp",
                "dataset": "USGS 3D Elevation Program (3DEP) seamless elevation",
                "groundResolutionMeters": 10,
                "representation": "Local elevation-tinted, four-direction hillshade derived from a clipped DEM",
                "sourceUrl": "https://www.usgs.gov/3d-elevation-program/about-3dep-products-services",
                "attribution": "USGS 3DEP elevation data; relief rendered for Icicle Creek Explorer",
                "width": terrain_width,
                "height": terrain_height,
                **terrain_summary,
            },
            "slope": {
                "url": "/overlays/usgs-3dep-slope.webp",
                "dataset": "USGS 3DEP seamless elevation; slope derived by this project",
                "groundResolutionMeters": 10,
                "representation": "Local slope raster derived from the clipped 3DEP DEM; shown in degrees",
                "sourceUrl": "https://www.usgs.gov/3d-elevation-program/about-3dep-products-services",
                "attribution": "Derived from USGS 3DEP elevation data by Icicle Creek Explorer",
                "width": terrain_width,
                "height": terrain_height,
                **terrain_summary,
            },
            "soilMapunits": {
                "url": "/overlays/nrcs-ssurgo-hydrologic-groups.webp",
                "dataset": "NRCS-derived SSURGO map-unit hydrologic soil group (HydrolGrp_DCD)",
                "period": "Current published SSURGO interpretations; soil survey dates vary by map unit",
                "groundResolutionMeters": 30,
                "representation": "Map-unit dominant hydrologic soil group rasterized to an approximately 30 m grid and clipped to the watershed",
                "sourceUrl": "https://services1.arcgis.com/gGHDlz6USftL5Pau/ArcGIS/rest/services/Soils_SSURGO/FeatureServer/0",
                "classCoveragePct": soil_coverage,
                "classes": [{"label": label, "color": color} for label, color in soil_categories],
                "width": soil_width,
                "height": soil_height,
            },
            "climatePrecipitation": {
                "url": "/overlays/prism-annual-precipitation.webp",
                "dataset": "PRISM 30-year mean annual precipitation (sum of monthly normals)",
                "period": "1991–2020 normals",
                "groundResolutionMeters": 4000,
                "representation": "Locally cached, clipped PRISM raster image for display; precipitation includes rain and snow water equivalent",
                "sourceUrl": "https://prism.oregonstate.edu/normals/",
                "minInches": climate["climatePrecipitation"]["min"],
                "maxInches": climate["climatePrecipitation"]["max"],
                "classBreaks": climate["climatePrecipitation"]["breaks"],
                "colors": climate["climatePrecipitation"]["colors"],
                "legendItems": climate["climatePrecipitation"]["legendItems"],
                "width": max(1, math.ceil(width_m / 4000)),
                "height": max(1, math.ceil(height_m / 4000)),
            },
            "climateTemperature": {
                "url": "/overlays/prism-annual-mean-temperature.webp",
                "dataset": "PRISM 30-year mean annual temperature (day-weighted monthly normals)",
                "period": "1991–2020 normals",
                "groundResolutionMeters": 4000,
                "representation": "Locally cached, clipped PRISM raster image for display; gridded estimates are not station measurements or forecasts",
                "sourceUrl": "https://prism.oregonstate.edu/normals/",
                "minCelsius": climate["climateTemperature"]["min"],
                "maxCelsius": climate["climateTemperature"]["max"],
                "classBreaks": climate["climateTemperature"]["breaks"],
                "colors": climate["climateTemperature"]["colors"],
                "legendItems": climate["climateTemperature"]["legendItems"],
                "width": max(1, math.ceil(width_m / 4000)),
                "height": max(1, math.ceil(height_m / 4000)),
            },
        },
    }
    METADATA_FILE.write_text(json.dumps(metadata, indent=2) + "\n")
    print(json.dumps({"output": str(PUBLIC), "metadata": str(METADATA_FILE), **{key: value for key, value in terrain_summary.items()}}, indent=2))


if __name__ == "__main__":
    main()
