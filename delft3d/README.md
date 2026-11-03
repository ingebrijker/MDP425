# Delft3D FM breakwater analysis – Mekong Delta (Can Tho and Ca Mau, former Sóc Trăng–Bạc Liêu)

Jupyter notebook `scripts/Delft3D_flow_maps_clean.ipynb` for post-processing and comparing Delft3D FM (flow) and SWAN (waves) model output of a breakwater intervention near Nha Mat / Vinh Chau. The model runs were made by ICOE; this notebook only analyses their output. The model output is not included in this repository (see Data).

## What it does

For three periods in 2023 it compares runs **with** the breakwater (intervention) and **without** it (baseline):

| Period | Dates | Runs |
|---|---|---|
| NE monsoon | February 2023 | intervention + baseline |
| SW monsoon | August 2023 | intervention + baseline |
| Storm | 15–19 August 2023 | baseline only (no breakwater) |

Output per section: animated flow and wave maps, difference maps and time series, residual currents, cross-shore profiles through the breakwater, and a diagnostic of velocity peaks behind the breakwater.

## Requirements

The notebook uses `numpy`, `xarray` (with `netCDF4` or `h5netcdf`), `scipy`, `matplotlib` and Jupyter. All are in the shared environment of this repository. From the root of the repository:

```bash
conda env create -f environment.yml
conda activate mdp425
```

Optional: `ffmpeg` (only if you save the animations as MP4): `conda install -c conda-forge ffmpeg`.

## Folder structure

```
delft3d/
├── README.md, .gitignore
├── scripts/
│   └── Delft3D_flow_maps_clean.ipynb
├── data/                                    model output (ICOE) – not included, see Data
└── results/
    ├── figures/
    │   └── Delft3D_flow_maps.pdf            the executed notebook with all figures
    └── tables/                              empty
```

## Data

The model output was provided by ICOE and is not included in this repository (too large, and not ours to share).
The notebook expects it in `data/` with this structure (`ROOT = ../data`, set in cell 1):

```
data/
├── Interventie/
│   ├── interventie_boundary_wgs84.ldb      breakwater/boundary polylines (lon/lat)
│   ├── NE/  FlowFM_map.nc, wavm-Wave_inter.nc
│   └── SW/  FlowFM_map.nc, wavm-Wave_inter.nc
├── No_breakwater/
│   ├── NE/  FlowFM_map/FlowFM_map.nc, wavm-Wave/wavm-Wave.nc
│   └── SW/  FlowFM_map/FlowFM_map.nc, wavm-Wave/wavm-Wave.nc
└── Storm/   FlowFM_map.nc, wavm-Song_test.nc
```

Baseline flow files fall back to `OLD_FlowFM_map/FlowFM_map.nc` if the first path does not exist. All paths are set in cell 1 (`SCENARIO_FILES`, `WAVE_FILES`).

Variables read from the flow files: `mesh2d_ucx`, `mesh2d_ucy`, `mesh2d_waterdepth`, `mesh2d_s1`, `mesh2d_face_x/y`, `mesh2d_face_nodes`, `mesh2d_node_x/y` (and, if present, `mesh2d_flowelem_bl` or `mesh2d_bedlevel`). From the wave files: `hsign`, `kcs`, `x`, `y`.

## How to run

1. Put the model output in `data/` (see above) and open `scripts/Delft3D_flow_maps_clean.ipynb`.
2. Run **Restart & Run All**, or run the sections top to bottom (later sections depend on the setup and geometry cells).
3. Expect some slow cells: the zoomed residual-current cell (section 5) reads all hourly steps of 46 000 cells and took about 10 minutes on the author's machine; most other cells take seconds to a minute.

## Notebook structure

| Section | Content | Main functions |
|---|---|---|
| 1. Setup | Imports, file paths, **all settings**, data access with caching, plot helpers | `flow()`, `wave()`, `common_times()`, `face_tree()`, `face_polygons()`, `structured_triangulation()`, `make_arrow_grid()`, `bin_vectors()` |
| 2. Geometry | Reads the `.ldb` boundaries, finds the breakwater segments, its axis and length, defines the transects perpendicular to it, and plots them as a check | `read_ldb()`, `bw_crossing_point()`, `transect_xy()`, `draw_transects()` |
| 3. NE monsoon | Flow-vector animation, flow-speed difference, Hs animation, Hs difference | `flow_comparison_animation()`, `flow_difference()`, `hs_comparison_animation()`, `hs_difference()` |
| 4. SW monsoon | Same four analyses for the SW monsoon | same functions |
| 5. NE vs SW | Residual (period-mean) currents of the baseline runs for the whole domain and the Nha Mat zoom; period-mean Hs for both monsoons | `residual_compare()`, `hs_compare_domain()` |
| 6. Storm | Maximum flow speed and Hs, time series at the intervention site, animation | `storm_load()`, `storm_summary_plot()`, `storm_animation()` |
| 7. Transects | 7.1 flow profiles, 7.2 Hs profiles, 7.3 snapshot of one transect, 7.4 diagnostic of velocity peaks in the lee zone | `plot_flow_profiles()`, `plot_hs_profiles()`, `transect_snapshot()`, `lee_side_diagnostic()` |

## Key settings (cell 1)

| Setting | Value | Meaning |
|---|---|---|
| `X_CENTER, Y_CENTER` | 105.84 E, 9.24 N | Intervention location (star in maps) |
| `ZOOM_XLIM / ZOOM_YLIM` | 105.82–105.88 E, 9.21–9.27 N | Zoom area for maps and statistics |
| `SPINUP_H` | 48 | Hours skipped in all statistics |
| `TRANSECTS` | 0.7 and 0.8 | Position along the breakwater (0 = west end, 1 = east end); labelled unhealthy/healthy mangroves |
| `OFFSHORE_KM, LEE_KM, TRANSECT_N` | 0.5, 0.35, 120 | Profile extent and number of points |
| `MAP_OFFSHORE_KM, MAP_LEE_KM` | 3.0, 1.0 | Transect length in the maps (drawing only) |
| `MAX_SNAP_DEG`, `MAX_SNAP_WAVE_DEG` | 0.004°, 0.005° | Maximum distance to the nearest flow face / wave cell |
| `VELOCITY_THRESHOLD` | 0.6 m/s | Threshold for "extreme" velocity in the diagnostic |

## Conventions and definitions

- **Differences** are always *intervention minus baseline*; negative means a reduction.
- **Flow speed** is the magnitude of the depth-averaged velocity, `sqrt(ucx² + ucy²)`. Cells with water depth below 0.01 m are treated as dry in the profiles.
- **Time alignment:** runs are matched on time stamps, not on index (the runs differ in length). The first 48 hours are excluded as spin-up.
- **Transect axis** `s` in km: negative is offshore, 0 is the breakwater, positive is the lee side. The transects are perpendicular to the main axis of the breakwater (fitted with an SVD through the segments). The 0.7 and 0.8 labels are positions only; the notebook does not know whether vegetation is in the model.
- **Hs profiles:** `s = 0` is set at the steepest decrease of the mean Hs in the intervention run (it can lie some tens of meters from the geometric breakwater position; the wave grid spacing near the breakwater is about 56 m). Flow profiles use the geometric position.
- **Residual current:** time-mean velocity vector over the analysis period, averaged per cell. Arrows are cell averages on a regular grid; arrow length is proportional to speed (reference arrow = 95th percentile).
- **Maps:** flow variables use the real mesh polygons; wave variables use the structured grid, with inactive cells masked.

## Things to be aware of

- The storm run has no breakwater. The notebook uses it for loads at the site only; the water-level increase relative to the SW baseline is indicative (different run and mesh).
- The storm wave grid is much coarser than the monsoon grid: the nearest active wave cell is about 1.3 km from the site.
- Hourly output limits how well short velocity peaks in the lee zone are resolved.
- Lee-zone profiles beyond about 0.2 km behind the breakwater flatten into plateaus (nearest cell is dry or too far); do not interpret them.
- `mesh2d_ucx/ucy` have no layer dimension in these files, so velocities are treated as depth-averaged.
- Some code comments and printed messages are still in Dutch.

## Outputs

The notebook shows figures and animations inline and does not write files. `results/figures/Delft3D_flow_maps.pdf` is a PDF of the executed notebook with all figures. To keep the animations, save them with `anim.save('name.mp4', writer=FFMpegWriter(fps=4))` or as GIF with `PillowWriter`, using the animation objects returned by `flow_comparison_animation()` and `hs_comparison_animation()`.