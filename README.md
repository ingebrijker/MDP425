## MekongDeltaMDP

Data processing and analysis for MDP425: coastal erosion, mangroves and breakwaters along the coast of Can Tho and Ca Mau (former Sóc Trăng and Bạc Liêu), Mekong Delta, Vietnam (Vinh Chau – Lai Hoa – Nha Mat).

Each folder is a separate analysis with its own README, and the same structure: `scripts/` (notebooks), `data/` (input) and `results/` (figures and tables).

| Folder | What it does | Main notebook(s) |
|---|---|---|
| [`hydro/`](hydro/) | Field campaigns (June 2025, June 2026, Oct 2026): waves, water levels, currents, inundation and wave transformation offshore → mudflat; ERA5 storm and long-term wave and wind conditions | `fieldwork_jun25_jun26.ipynb`, `fieldwork_oct26.ipynb`, `storm.ipynb`, `longterm.ipynb` |
| [`shoreline_monitor/`](shoreline_monitor/) | Shoreline change 1988–2025 per coastal section (A–N) from the Deltares Shoreline Monitor v2.1 | `data_collection.ipynb`, `analysis.ipynb` |
| [`mangrove_analysis/`](mangrove_analysis/) | Mangrove belt width and seaward mangrove edge 1988–2026 per section, from Landsat and Sentinel-2 (Google Earth Engine) | `mangrove_analysis.ipynb`, `gee_scripts/*.js` |
| [`delft3d/`](delft3d/) | Post-processing of Delft3D FM and SWAN runs (by ICOE) with and without a breakwater near Nha Mat: flow, waves, residual currents, storm loads | `Delft3D_flow_maps_clean.ipynb` |
| [`topology/`](topology/) | Cross-shore profile slopes (healthy and unhealthy mangrove, mudflat) and erosional cliffs at Lai Hoa, from RTK-GPS points (Oct 2026) | `topology_analysis.ipynb` |
| [`sediment/`](sediment/) | Annual longshore sediment transport (Kamphuis, CERC, Van Rijn), rebuilt from Van Rijn's `Littoral.xls` | `annual_longshore_transport.ipynb` |

## Getting started

```bash
conda env create -f environment.yml
conda activate mdp425
```

All folders use this one environment (`environment.yml` in the root of the repository).

Then open a notebook in the `scripts/` folder of an analysis and run it from top to bottom (*Restart & Run All*). The notebooks use relative paths (`../data`, `../results`), so they run from their own `scripts/` folder.

Where a notebook has a `SAVE` switch at the top, `SAVE = False` (default) only shows the figures and tables; `SAVE = True` saves them to `results/` and overwrites the versions used in the report.

## Data

Not all data are in this repository. Some are restricted or too large, and are listed in `.gitignore`:

| Folder | Data | Owner / source | In this repository? |
|---|---|---|---|
| `hydro/` | Field data June 2025 and June 2026 | Thuyloi University (collected by Dr. Hoang Tung Dao) | No, restricted |
| `hydro/` | Field data October 2026 | Thuyloi University (contact: Dr. P.H. Hung) | No, restricted |
| `hydro/` | ERA5 and IBTrACS | Copernicus Climate Change Service; NOAA (open data) | Yes |
| `shoreline_monitor/` | Shoreline Monitor v2.1 | Deltares | No, downloaded with `data_collection.ipynb` (needs a Deltares SAS token in `.env`) |
| `mangrove_analysis/` | Google Earth Engine output | Landsat: USGS; Sentinel-2: Copernicus (open data) | Yes (Esri background images are not) |
| `delft3d/` | Delft3D FM / SWAN model output | ICOE | No, too large and not ours to share |
| `topology/` | RTK-GPS points Lai Hoa (October 2026) | Collected together with ICOE | No, restricted |
| `sediment/` | None needed: all input is set in the notebook | n/a | n/a |

The restricted data are not ours to share; ask the owner for access. With data in the same structure, the notebooks can be used to repeat the analysis for new measurements.

See the README in each folder for the input files, settings, assumptions and outputs.
