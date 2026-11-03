# Hydro: fieldwork data and storm analysis

This folder processes and analyses the hydrodynamic field data and the offshore storm and wave conditions (ERA5) of the MDP Vietnam project:

| Notebook | Campaign | Site | Topic |
|---|---|---|---|
| `fieldwork_jun25_jun26.ipynb` | June 2025 and June 2026 | Vinh Chau | Waves, water levels, currents and SSC offshore and on the mudflat; wave transformation offshore → nearshore |
| `fieldwork_oct26.ipynb` | October 2026 | Lai Hoa | Water level, inundation and flow velocity in a healthy and an unhealthy mangrove section behind the breakwater, and offshore |
| `storm.ipynb` | Ten historical storms (1956–2018) | Delft3D study area | Storm wave and wind conditions (ERA5, IBTrACS) and Delft3D design storms |
| `longterm.ipynb` | 2025 | Vinh Chau–Nha Mat | Long-term wave and wind conditions (ERA5) and Delft3D input summaries |

---

## Folder structure

```
hydro/
├── data/
│   ├── june2025/          ← restricted, not on GitHub (see .gitignore)
│   ├── june2026/          ← restricted, not on GitHub
│   ├── oct2026/           ← restricted, not on GitHub
│   └── data_storm/        ← ERA5 and IBTrACS files (open data, on GitHub)
├── scripts/
│   ├── fieldwork_jun25_jun26.ipynb
│   ├── fieldwork_oct26.ipynb
│   ├── storm.ipynb
│   └── longterm.ipynb
└── results/
    ├── june2025_2026/     ← figures (.png) and tables (.csv) of fieldwork_jun25_jun26
    ├── oct2026/           ← figures (.png) of fieldwork_oct26
    └── storm/             ← figures (.png) and tables (.csv) of storm.ipynb
```

The notebooks run from `scripts/` and read and write with relative paths (`../data/...`, `../results/...`).

---

## How to run

1. Install the shared environment of this repository. From the root of the repository: `conda env create -f environment.yml` and `conda activate mdp425`.
2. Put the data files in `data/` as listed below (the file names must stay the same).
3. Open a notebook in `scripts/` and run it from top to bottom (*Restart & Run All*).

**Saving results.** The data cell at the top of each notebook has a switch:

```python
SAVE = False   # True = save figures and tables in results/ (overwrites the files there)
```

With `SAVE = False` (the default) the notebook only shows the figures and tables, so the versions in `results/` (the ones used in the report) stay unchanged. With `SAVE = True` the last cell saves all figures (`.png`) and tables (`.csv`) to `results/`. **No data are ever written**, only figures and result tables.

**Data access.** The fieldwork data are restricted and are not stored on GitHub (see `.gitignore`); the storm data are open and included.
- June 2025 and June 2026: collected and provided by Dr. Hoang Tung Dao (data and data description).
- October 2026: ICOE data; ask ICOE for access.
- Storm analysis (`data/data_storm/`): open data, included in this repository. ERA5 (Copernicus Climate Change Service) and IBTrACS (NOAA).

**Times.** All times are local time (UTC+7). ERA5 is in UTC (shift −7 h when comparing).

---

## 1. `fieldwork_jun25_jun26.ipynb`: Vinh Chau, June 2025 and June 2026

The data were collected by Dr. Hoang Tung Dao. We did not collect them; this notebook only processes and analyses the provided instrument output.

### Input data

| Folder | File | Instrument | Station | Interval |
|---|---|---|---|---|
| `june2025/` | `2025_Data_Wave_ADCP_TXVC13_Wave.txt` | ADCP (bottom-mounted), waves | VC-OFF | 1 h |
| `june2025/` | `2025_Data_Wave_ADCP_TXVC13_Flow.txt` | ADCP, depth-averaged current | VC-OFF | 1 h |
| `june2025/` | `2025_Data_Wave_WB2026.txt` | Wave buoy | VC-OFF | 30 min |
| `june2025/` | `2025_Data_WaterDepth.txt` | Van Essen Diver | VC-NEAR (mudflat) | 30 min |
| `june2025/` | `2025_Data_Wave_TWR2050R.txt` | RBR TWR-2050 pressure logger (on the bed) | VC-NEAR (mudflat) | 90 min |
| `june2025/` | `2025_Data_SSC_Nearshore.txt` | SSC samples | VC-NEAR | samples |
| `june2025/` | `2025_Data_SSC_Offshore.txt` | SSC samples | VC-OFF | samples |
| `june2026/` | `2026_Data_Wave_WB2026.txt` | Wave buoy | VC-BUOY-S | 30 min |
| `june2026/` | `2026_Data_WaterDepth.txt` | TWR-2050 water depth | VC-TWR (mudflat) | 10 min |
| `june2026/` | `2026_Data_Wave_TWR2050R.txt` | TWR-2050 waves | VC-TWR (mudflat) | 10 min |

Station coordinates and the full instrument list are in Dr. Dao's data description and in Appendix A of the report.

### What the notebook does

| Section | What happens |
|---|---|
| **Setup of dataframe** | Reads all files, gives the record count and start/end time per dataset (`data_summary`). |
| **Processing of raw data** | Renames the columns to one naming convention. |
| **Quality control** | Flags invalid records; **nothing is deleted** (see the QA rules below). Also corrects the TWR depth and converts the 2026 buoy direction. |
| **Wave calculations** | Dispersion relation (Newton–Raphson) → wavelength `L`, `kh`, wave regime (shallow/intermediate/deep), phase and group speed `C`, `Cg`, energy `E = ρgHs²/16`, wave power `P = E·Cg`, steepness, `Hs/h` and bed orbital velocity `U_bed`. Only for the 2025 TWR (with corrected depth `h`) and the 2025 ADCP: the 2026 TWR has no Tp and the buoys have no water depth. |
| **Combine measured and calculated data** | Matches datasets by nearest time stamp (`merge_nearest`, max 1 h) and joins the 2026 TWR depth and wave records. |
| **Campaign tables** | Removes flagged records (`drop_flagged`), shows a QA summary (records / removed / used), then: (1) conditions per campaign, one offshore and one nearshore row per year (means and 95th percentile of Hs, Tp, mean wave direction, current, high-water depth, % inundated, Hs/h); (2) wave buoy statistics in the same format as the ERA5 overview, with the highest-wave event per campaign and an ERA5 SW-monsoon reference row. |
| **Tide, inundation and wave transformation** | High waters (`find_peaks`, parabolic refinement), flood and ebb duration (at the 0.1 m level), % of time above depth levels, high-water time lag VC-OFF → VC-NEAR and mudflat slope (2025). Wave transformation from buoy to mudflat: `K = Hs_near/Hs_off`, energy share `K²`, depth-limited fit `Hs_near = min(a·Hs_off, γ·h)` with `R²`, and the Pearson `r` of `Hs_near` with `Hs_off` and with `h`. |
| **SSC relationships** | SSC against Hs, Tp, depth, `U_bed`, wave power and current (scatter plots, Pearson and Spearman); buoy vs ADCP check (Hs); SSC during rising vs falling tide. *Handled by a colleague; still to be checked.* |
| **Assumption check** | Table of how datasets are linked and the assumption behind each link. |
| **Appendix: raw data per sensor** | Figures A1–A7: every variable of every data file over time, flagged records in orange (nothing removed). Not shown in the notebook (raw data); only saved when `SAVE = True`. |
| **Save figures and tables** | Saves everything to `results/june2025_2026/` when `SAVE = True`. |

### Quality control rules

| Instrument | Flag | Rule |
|---|---|---|
| Wave buoy (2025, 2026) | `QA_outlier` | Tp = 18.2 s (lowest frequency bin of the spectrum), or Hmax/Hs < 1.3 or > 4 |
| ADCP (2025) | `QA_invalid` | < 0.35 m water above the sensor (data description), or failed spectrum (Tp > 10 s, Hs < 0.02 m). Current records get the same flag. |
| TWR 2025 | `QA_invalid` | Before placement (14/06/2025 09:00) |
| TWR 2026 | `QA_invalid` | After removal (29/06/2026 17:00) and while handled (23/06/2026 15:50–16:10) |
| Diver 2025 | `exposed` | Depth ≤ 0.02 m (mudflat dry) |
| TWR 2025, 2026 | `dry_or_exposed` | Hs < 0.01 m (no waves = dry) |

Corrections (no data removed):
- **TWR depth `h`.** The TWR reads an apparent depth at low tide. `h` is the depth above the logger's own low-tide reading (interpolated in time). For 2025 the corrected depth agrees with the Diver within 0.02 m.
- **2026 buoy direction.** Given as direction of travel; converted to direction of origin (+180°, `Dir_from`). From 34° there is only 14.5 km of open water, too short for the measured Tp (3–7 s); the converted 214° agrees with the SW monsoon and ERA5 (228°).
- **Directions** are averaged with the circular mean.

### Settings you may want to change

| Setting | Where | Current value |
|---|---|---|
| `SAVE` | Data cell (top) | `False` |
| `data_dir`, `fig_dir`, `table_dir` | Data cell (top) | `../data`, `../results/june2025_2026` |
| TWR placement / removal / handling times | QA run cell | 14/06/2025 09:00; 29/06/2026 17:00; 23/06/2026 15:50–16:10 |
| Wet thresholds | QA run cell | Diver > 0.02 m; TWR Hs ≥ 0.01 m |
| Buoy direction convention | QA run cell | 2025 `from`, 2026 `to` |
| Buoy artefact rule | `flag_buoy_artifacts` | Tp 18.2 s; Hmax/Hs 1.3–4.0 |
| ADCP validity | `flag_adcp_invalid` | min. 0.35 m depth; Tp ≤ 10 s; Hs ≥ 0.02 m |
| Minimum depth for Hs/h and transformation | Outlier cell (`min_h_ratio`) | 0.2 m |
| Level for flood/ebb duration | Step 2 cell (`flood_level`) | 0.1 m |
| Cross-shore distance VC-OFF – VC-NEAR | Step 2 cell (`cross_shore_km`) | 2.39 km (coast 70°) |
| Assumed ADCP sensor height | Step 2 cell (`adcp_height`) | 0–0.5 m |
| ERA5 reference row | ERA5-table cell | SW monsoon 2025 (ERA5 Table 5.1) |

### Assumptions and limitations

- Each campaign covers only one week in the SW monsoon; results cannot be extended to other seasons.
- Buoy positions (3.8 vs 9 km from VC-NEAR), nearshore stations and tidal phase (spring–neap in 2025, neap–spring in 2026) differ between the campaigns, so differences between the years are not due to weather alone.
- The data were received as processed output; instrument settings and mounting heights could not be checked.
- The TWR may underestimate small waves (about 15% for Hs < 0.2 m).
- The 2026 direction conversion and the mudflat slope (unknown ADCP sensor height) are based on assumptions, not provider information.
- The 2025 transformation fit rests on 23 pairs; both fits only cover offshore Hs up to 1.1 m (no storm conditions).
- No currents in 2026; the 2026 TWR gives no wave period; the 2025 current direction is unusable.
- Bed orbital velocity `U_bed` uses Hs and Tp in linear wave theory; the ADCP depth is the depth above the sensor, not the full water depth.

---

## 2. `fieldwork_oct26.ipynb`: Lai Hoa, October 2026

Compares a **healthy** and an **unhealthy** mangrove section, both behind the breakwater, with an **offshore** location. The data are ICOE data (not included in this repository).

### Input data (`data/oct2026/`)

| Data | File | Notes |
|---|---|---|
| Water level, healthy | `LaiHoa_Healthy_Mangrove_261012103755_Y6762.CSV` | Diver, 15-minute interval |
| Water level, unhealthy | `LaiHoa_Unhealthy_Mangrove_261012220322_Y6818.CSV` | Diver, 15-minute interval |
| Flow, healthy + offshore | `ECO_0892_healthy_behindbreakwater_and_unhealthy_offshore_chartdata.csv` | ECO 0892, both sites in one export |
| Flow, unhealthy | `ECO_0885_unhealthy_behindbreakwater_chartdata.csv` | ECO 0885 |

Notes on the measurements:
- The healthy diver started measuring at 17:47 on 10-10, the unhealthy diver at 17:15 on 10-10.
- Both devices were switched on before they were installed: healthy in the afternoon of 10-10, unhealthy in the morning of 11-10 (time constraints).
- Low-water measurements stopped at about +20 cm, where the devices failed to measure.
- The two ECO exports use different time formats (`month/day/year hour:minute` for ECO 0892, `hour:min:sec day/month/year` for ECO 0885). Both are set in the notebook.

### What the notebook does

| Part | Step | What happens |
|---|---|---|
| Water level | Pressure and temperature summary | Mean, standard deviation, minimum, maximum and range per section. |
| Water level | Relative water level | Pressure converted to water-level change relative to the first measurement of each diver; summary and figure. |
| Water level | Inundation time | Subtracts a height difference Δh from the water level. Level ≥ 0 counts as inundated, < 0 as dry. Gives dry time, inundation time and % inundated. |
| Flow velocity | Split the raw files | Each ECO export holds several blocks (upper, middle and lower flow velocity, temperature, pressure, tilt). `read_block(first_row, last_row)` cuts out the blocks for healthy, offshore and unhealthy. |
| Flow velocity | Time series | Flow velocity per layer: healthy vs offshore, unhealthy vs offshore, healthy vs unhealthy. Gaps longer than 15 minutes are drawn as breaks. |
| Flow velocity | Flow reduction | Unhealthy (behind breakwater) vs offshore, on 5-minute means, at moments where both have data: reduction of the means and median reduction per time step. |
| Flow velocity | Bed shear stress | `τb = ρ · g · n_M² / h^(1/3) · u²` for n_M = 0.03 and 0.04. Each velocity is matched to the nearest water level (max. 10 minutes apart). The water levels are calculated from the Diver files in the notebook itself (relative level minus Δh); no separate notebook or intermediate file is needed. |
| | Save figures | Saves all figures to `results/oct2026/` when `SAVE = True`. |

### Settings you may want to change

| Setting | Where | Current value |
|---|---|---|
| `SAVE` | Data cell (top) | `False` |
| `data_folder`, `fig_dir`, `table_dir` | Data cell (top) | `../data/oct2026`, `../results/oct2026` |
| Measurement interval | Inundation time | 0.25 h (15 minutes) |
| Δh (cm) | Inundation time | Healthy: 13.51. Unhealthy: 4.11 and 6.73 (the first value is used for the shear stress) |
| Row ranges of the blocks | Splitting of the ECO files | `first_row` is the line with the column names, `last_row` the last data line |
| Maximum gap in the plots | `break_gaps` | 15 minutes |
| Averaging step for flow reduction | `reduction` | 5 minutes |
| Manning roughness n_M | Bed shear stress | 0.03 and 0.04 |
| Water density ρ | Bed shear stress (`add_tau_b`) | 1000 kg/m³ |

### Assumptions and limitations

- **No barometric correction.** The diver measures absolute pressure, so changes in air pressure show up as apparent water-level changes of a few cm, comparable to the Δh values. Correct with a barometer record if available.
- **Records before installation** (healthy before the afternoon of 10-10, unhealthy before the morning of 11-10) are not flagged and are included in the statistics.
- **Relative water level.** Each diver starts at 0 cm at its own first measurement, so the two sections do not share a reference level; only inundation duration and tide shape can be compared, not absolute heights.
- **Short record.** About 41 hours (about 3 tides) per section.
- **Fresh-water conversion.** 1 cmH2O is taken as 1 cm of water; for saline water the real depth change is about 2.5% smaller.
- **Regular interval.** Dry and inundated times assume a constant time step.
- **Bed shear stress: velocity source.** Both the "healthy" and the "unhealthy" calculation use the middle-layer velocities of the unhealthy logger (ECO 0885), combined with the water level of the respective section. Check whether this is intended.
- **Water density.** `bed_shear_stress()` has a default of 1025 kg/m³, but `add_tau_b()` passes 1000 kg/m³, so 1000 is used in the results.
- **Offshore data.** The offshore data sit in the same blocks as the healthy data, after the healthy period, and are separated with `iloc[n:]`. Check these numbers if the export changes.
- **Flow reduction** is only calculated for unhealthy vs offshore, and only where both loggers have data.

---

## 3. `storm.ipynb` and `longterm.ipynb`: storm and long-term conditions

Data in `data/data_storm/` (included in this repository): ten storm records and `Era5_2025.grib` (ERA5, Copernicus Climate Change Service) and `IBTrACS.WP.v04r01_20260728.nc` (IBTrACS, NOAA). Contains modified Copernicus Climate Change Service information (2026). To update the data, download ERA5 from the Copernicus Climate Data Store (ERA5 hourly data on single levels, GRIB) and IBTrACS (Western Pacific, netCDF) from NOAA NCEI, and keep the file names or change them in the notebooks.

`storm.ipynb` analyses ten historical GRIB storm records for the Delft3D study area around **9.259944 N, 105.956639 E**.

It loads the known wave and wind variables directly from the GRIB files:

- `swh`: significant wave height (`HS`)
- `pp1d`: peak wave period (`TP`)
- `mwp`: mean wave period, used as `Tm0`
- `mwd`: mean wave direction
- `10u`, `10v`: 10 m wind components

The data are clipped to a 0.5-degree BBOX around the target location. For each storm, the notebook finds the maximum spatially averaged wave height and analyses a six-hour window around that peak. A short window is used because a moving cyclone produces a local peak for hours, not for the duration of the full historical record.

The notebook displays:

1. A plot for each storm showing waves, wave direction and wind.
2. A formatted table of historical Delft3D inputs: HS, TP, Tm0, wave direction, `u10`, `v10` and wind speed.
3. A formatted design-condition table with realistic, conservative and extreme scenarios.

The design scenarios are based on the observed storms. The realistic scenario uses median six-hour peak-window conditions, the conservative scenario uses the 99th percentile of the selected offshore values, and the extreme scenario uses the largest observed spatially averaged wave height. The figures and tables are shown in the notebook and, with `SAVE = True`, saved to `results/storm/`.

`longterm.ipynb` converts the 2025 ERA5 record (`Era5_2025.grib`) into long-term wave and wind conditions and Delft3D input summaries for the Vinh Chau–Nha Mat area.

---

## Outputs (`results/`, only with `SAVE = True`)

| Folder | File | Content |
|---|---|---|
| `june2025_2026/` | `A1_2025_VC-OFF_ADCP_wave.png` … `A7_2026_VC-BUOY-S_buoy.png` | Appendix figures: raw data per sensor, flagged records in orange. Not on GitHub (raw data, see `.gitignore`) |
| `june2025_2026/` | `buoy_vs_adcp_hs_2025.png` | Hs of the buoy vs the ADCP at VC-OFF |
| `june2025_2026/` | `ssc_relationships_nearshore.png`, `ssc_relationships_offshore.png` | SSC against wave and flow parameters |
| `june2025_2026/` | `ssc_rising_falling.png` | SSC during rising and falling tide |
| `june2025_2026/` | `wave_transformation_2025_2026.csv` | Wave transformation table (n, Hs offshore/nearshore, K, energy share, γ, a, R², RMSE, Pearson r) |
| `oct2026/` | `waterlevel_relative.png`, `waterlevel_inundation.png` | Water level and inundation per section |
| `oct2026/` | `flow_velocity_healthy_vs_offshore.png`, `flow_velocity_unhealthy_vs_offshore.png`, `flow_velocity_healthy_vs_unhealthy.png`, `flow_velocity_reduction_unhealthy_vs_offshore.png` | Flow velocity per layer and flow reduction |
| `storm/` | Figures (`.png`) | Waves, wave direction and wind per storm |
| `storm/` | Tables (`.csv`) | Historical Delft3D inputs per storm and design conditions (realistic, conservative, extreme) |

All other tables (QA summary, campaign conditions, wave buoy statistics, tide and inundation, inundation times, flow reduction, bed shear stress) are shown in the notebooks only.