---
id: auxiliary-scripts
title: Offline data-prep scripts
summary: A toolbox of standalone scripts that turn raw mission imagery and data into the tiled, indexed format MMGIS expects. Run on a workstation, never at runtime.
related:
  - backend-api/feature-modules
  - adjacent-servers
key_idea: A folder of standalone Python (mostly) scripts you run by hand before deploying MMGIS. They produce the static tile assets, legends, and normalized data files that MMGIS then serves.
watch_out:
  - One of the included tile-slicing scripts is a customized fork of a popular open-source tool, adapted for planetary (non-Earth) projections. Using the unmodified upstream tool on Mars or lunar imagery silently produces output for the wrong coordinate system.
seams_touched:
  - backend-postgres
  - backend-adjacent-services
---

## What lives in this folder

A toolbox, not a service. Each subdirectory is an independent script (or pair of scripts) you run by hand on a workstation or build machine, before the data ever reaches the running MMGIS app. The job: take raw mission products — gigantic satellite imagery, digital elevation models, geographic features in dump files, color schemes — and produce the small, tiled, indexed files that MMGIS expects to find when it runs.

Almost everything here is Python wrapping the open-source geographic toolkit GDAL. A handful of Node scripts handle the cases where streaming JSON or asset compilation is more natural.

## Rough groups of what's in there

- **Slicing imagery into tiles for non-Earth projections.** Mars, the Moon, and other bodies use different coordinate systems than Earth, and the standard tile-slicing tools don't know about them. MMGIS ships modified forks that do. There are also convenience wrappers for common pipelines and for converting bit depths.
- **DEM (elevation) tiles.** A specialized mode that encodes elevation numbers into the color channels of normal PNG image tiles. The frontend decodes them back into elevations when drawing the 3D globe or computing terrain analysis.
- **Bulk pipelines.** Walks a folder of imagery files, applies color schemes, generates tiles and legends in one shot, optionally spits out JSON snippets the operator can paste into the mission's configuration.
- **Catalog inputs.** Produces cloud-optimized GeoTIFFs and STAC catalog entries — the inputs the optional Python tile/catalog services consume.
- **Vector data normalization.** Rewrites big geographic feature dumps into a streaming-friendly format so they can be uploaded into the database without buffering the whole file in memory.
- **Legends and color schemes.** Reads a color file, produces both a colored output raster and a legend table that MMGIS can render.
- **Domain-specific assets.** One-off tools for things like baking the standard geologic-mapping symbol library into the format the drawing tool expects.

## How they fit into setting up a mission

A typical workflow for adding a new mission basemap:

1. Drop a planetary-projected satellite image into a working directory.
2. Run the tile-slicing script with the appropriate flags for the planet's coordinate system. Out comes a folder of tile images organized by zoom level and tile coordinates.
3. Optionally run the legend script to produce a legend table.
4. Point the mission's configuration at the resulting folder.

For vector data the path is similar: convert to a streaming-friendly format, then upload it through the Datasets API endpoint.

## How they're set up

All these scripts share a common Python environment defined at the repo root. That same environment also powers the optional Python sidecar services, so one setup covers both data prep and the runtime tile servers. Some scripts have a few extra Node-side dependencies that need their own install step.

## What this means for a static refactor

Almost nothing changes here. **The offline toolbox is exactly the kind of "build-time" process that survives a refactor toward a static deployment**, because it was never a runtime thing in the first place. You still:

- Slice planetary imagery into tile folders.
- Generate elevation tiles.
- Produce STAC catalogs.

The only difference is *where the output goes.*

- In the current setup, the output ends up in directories the Node server serves from disk.
- In a static deployment, the same output gets uploaded to cloud storage (S3, etc.) and the frontend points at the public URLs.

The scripts themselves don't need to change.
