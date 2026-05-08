---
id: auxiliary-scripts
title: Auxiliary GIS processing scripts
summary: Offline data-prep utilities — mostly Python over GDAL — for slicing rasters into tiles, building DEMs, generating legends, and normalizing vector data before it lands in MMGIS.
related:
  - backend-api/feature-modules
  - adjacent-servers
key_idea: A toolbox of standalone GDAL/Python scripts (plus a few Node scripts) you run by hand on a workstation to turn raw mission products into the tiled, indexed artifacts MMGIS expects on disk or in Postgres.
watch_out:
  - gdal2customtiles is a fork of upstream gdal2tiles.py with an --extentworld flag for non-Earth IAU-2000 projections — using stock gdal2tiles for Mars or lunar imagery silently produces Web Mercator tiles that won't line up.
seams_touched:
  - backend-postgres
  - backend-adjacent-services
---

## What lives here

`auxiliary/` is a toolbox, not a service. Each subdirectory is an independent script (or pair of scripts) you run by hand on a workstation or build machine, before the data ever reaches MMGIS at runtime. The job of these tools is to take raw mission products — large GeoTIFFs in non-Earth projections, DEMs, GeoJSON dumps, colormap definitions — and turn them into the tiled, indexed, web-friendly artifacts MMGIS expects to find on disk or in Postgres.

Almost everything is Python wrapping GDAL/OGR. The handful of Node scripts (`populateMosaics`, `geojson2ndgeojson`, `compileGeologic`) cover the cases where streaming JSON or asset compilation is more natural than a GDAL pipeline. There is also a leftover csh helper (`gis_parm/`) for environment plumbing.

## Rough groups

The scripts cluster by purpose:

- **Raster to tiles for arbitrary projections.** `gdal2customtiles/` and `gdal2tiles4extent/` are forks of the upstream `gdal2tiles.py` that add an `--extentworld` flag so you can slice rasters in IAU-2000 planetary projections (Lunar South Polar, Mars equirectangular, etc.) instead of being limited to Web Mercator. `rasterstotiles/` and `1bto4b/` are convenience wrappers and bit-depth-conversion variants.
- **DEM tiles.** `demtiles/` and the `--dem` mode of `gdal2customtiles.py` encode 32-bit elevation values into RGBA PNG tiles that the frontend's 3D globe and Viewshed tool decode at draw time. The encoding is a fixed convention — see the gdal2customtiles readme for the 0-value remapping detail.
- **Bulk pipelines.** `bulk_tiles/` walks a directory of TIFFs, applies colormaps, generates tiles and legends in one shot, and can spit out JSON snippets ready to paste into an MMGIS layer config.
- **Mosaics and STAC.** `populateMosaics/` decorates a GeoJSON of rover positions with image-tile URLs derived from a CSV of mosaic parameters. `stac/tifs2cogs/` and `stac/create-stac-items/` produce Cloud-Optimized GeoTIFFs and STAC items consumed by the [adjacent TiTiler/STAC services](../adjacent-servers/index.md).
- **Vector normalization.** `geojson2ndgeojson/` rewrites a `FeatureCollection` as newline-delimited features so that very large vector dumps can be stream-uploaded into the [Datasets module](../backend-api/feature-modules.md) instead of buffered whole.
- **Legends and colormaps.** `rastertolegend/` reads a GDAL color-relief file and emits both a colored raster and a `legend.csv` MMGIS can render. `quantize_colormap/` derives a discrete matplotlib colormap from raster value distributions. `rasterLabels/` rasterizes a labeled vector layer into a lookup raster.
- **Domain-specific assets.** `compileGeologic/` is a one-off Node tool that bakes the FGDC geologic pattern/symbol library into PNGs and a JSON manifest the Draw tool consumes.

## How they fit into mission-data prep

A typical onboarding flow for a new mission basemap is: drop a planetary-projected GeoTIFF into a working directory, run `gdal2customtiles.py -p raster --extentworld …` to produce a tile pyramid under `Missions/<name>/Layers/`, optionally run `rastertolegend.py` to produce a legend CSV alongside it, and then point an MMGIS layer config at the resulting directory. For vector data the path is similar: convert to ndGeoJSON, then POST it to the Datasets endpoints described in [feature modules](../backend-api/feature-modules.md). Mosaic and STAC products feed the corresponding backend modules and the adjacent Python services.

## Runtime environment

These scripts share the project's `mmgis` micromamba environment, defined at the repo root in `python-environment.yml` and built into the Docker image (see the `WITH_STAC` block in `Dockerfile`). It pins GDAL 3.9, rasterio, and the Python deps the STAC/TiTiler sidecars also depend on, so a single `micromamba activate mmgis` covers both auxiliary script runs and adjacent-server development. Per-script READMEs note any extra Node packages (`csv-parser`, `JSONStream`) that need an `npm install` first.
