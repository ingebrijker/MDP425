# Shoreline Monitor analysis: Vinh Chau – Nha Mat (Mekong Delta)

Shoreline change along the coast between Vinh Chau and Nha Mat (Cần Thơ and Cà Mau provinces, Vietnam), based on the Deltares Shoreline Monitor (v2.1). The coast is divided into fourteen sections (A–N, about 66 km). For each section, the notebook calculates shoreline change rates for two periods and reconstructs historical shoreline positions. Part of the MDP Vietnam project.

## Contents

```
shoreline_monitor/
├── README.md, .gitignore
├── .env                          ← your Deltares SAS token (not on GitHub)
├── data/                         ← downloaded data (not on GitHub, see Data)
├── scripts/
│   ├── data_collection.ipynb
│   └── analysis.ipynb
└── results/                      ← figures (.png) and tables (.csv), only saved when SAVE = True
```

| File | What it does |
|---|---|
| `scripts/data_collection.ipynb` | Downloads the Shoreline Monitor v2.1 data for the study area from the CoastPy STAC catalogue (bounding box 105.3–106.4 °E, 8.9–9.8 °N) and saves it as parquet files in `data/`. The last cell checks whether Deltares has published newer data. |
| `scripts/analysis.ipynb` | All analysis and figures (section figures, overview, site comparison, rate table) |
## Data

Shoreline Monitor v2.1 (Deltares), accessed through the CoastPy STAC catalogue in October 2026 (Calkoen et al., 2024). The data are not in this repository. Downloading needs a SAS token from Deltares: put it in a file `.env` in this folder as

```
AZURE_STORAGE_SAS_TOKEN=<your token>
```

`.env` and `data/` are in `.gitignore`, so the token and the data never go to GitHub. Run the data collection notebook first; it creates in `data/`:

| File | Content | Used for |
|---|---|---|
| `mekong_series_v2.1.parquet` | Shoreline position per transect per yearly composite (45,680 observations, 1,514 transects, 1987–2025; 23,962 primary) | All rates, maps and time series |
| `mekong_change_rate_v2.1.parquet` | Global Coastal Transect Repository (GCTR): transect geometry, coastal type and the published change rate | Locating and ordering transects; validation |
| `mekong_shorelines_v2.1.parquet` | Shoreline vectors per year (7,584 segments) | Visual inspection only |

The file names include the data version, so a newer version (set `STAC_VERSION` in both notebooks) is saved next to the old files without overwriting them.

Notes on the data:
- The shoreline position is measured from land to sea: an increase means **accretion**, a decrease means **erosion**.
- Each yearly position is a composite of all Landsat images of that year. It is labelled 1 January but represents mid-year.
- Only observations flagged as **primary** are used. Non-primary observations often capture pond edges, channels or mudflat edges.
- No tidal correction is applied. On this muddy coast, the detected waterline varies by 300–600 m between years.

## Requirements

All packages (including `coastpy`, `pystac`, `python-dotenv` and `pyarrow` for the download) are in the shared environment of this repository. From the root of the repository:

```bash
conda env create -f environment.yml
conda activate mdp425
```

`contextily` downloads satellite basemaps (Esri World Imagery), so the figures need an internet connection.

## How to run

1. Run `scripts/data_collection.ipynb` once. Check that the three parquet files are in `data/`.
2. Open `scripts/analysis.ipynb` and run **Restart & Run All**. The cells depend on each other, so always run them from the top.
3. Change settings only in the **run cells** (marked `# Run …`). All logic is in functions.

**Saving results.** The *Load Data* cell at the top of `analysis.ipynb` has a switch:

```python
SAVE = False   # True = save figures and tables in results/ (overwrites the files there)
```

With `SAVE = False` (the default) the notebook only shows the figures and tables, so the versions in `results/` (the ones used in the report) stay unchanged. With `SAVE = True` the last cell saves them to `results/`. No data are written.

## Outputs (`results/`, only with `SAVE = True`)

| File | Content |
|---|---|
| `sections_map.png` | Division of the study area into sections A–N |
| `sections_<section>.png` (e.g. `sections_D_E.png`) | Section figure: reconstructed shorelines and change rate along the coast |
| `overview_1988_2010.png`, `overview_2010_2025.png` | Change rate along the whole study area per period |
| `site_rates.png`, `site_rates.csv` | Shoreline position through time and rates for Vinh Chau, Lai Hoa and Nha Mat |
| `section_change_rates.csv` | Median change rate per section and period (m/year, positive = seaward) |
| `section_coverage.csv` | Share of transects with a rate per section and period (%) |

The section figure run cell makes one figure per run, so Restart & Run All only saves the section set in that cell. To save all sections, run the cell once per section and then run the save cell.

## Notebook structure (`analysis.ipynb`)

| Part | Cells | Content |
|---|---|---|
| Setup | Imports, *Load Data* | Libraries, `SAVE`, `data_folder`, `fig_dir`, `table_dir`, `STAC_VERSION = "v2.1"` |
| Sections | *Build Coastal Sections* | Coordinates of sections A–N (`sections`), `SECTION_ORDER`, interventions (`SECTION_INTERVENTIONS`), section map |
| Vectors | *Historical Shoreline Analysis* | Plots the Shoreline Monitor shoreline vectors (inspection only) |
| Section figures | Part 1–5 + *Run Section Figure* | Map of reconstructed shorelines + change rate along the coast, per section or group of sections |
| Overview | *Full system erosion/accretion* | Change rate along the whole study area, one figure per period |
| Sites | *Site specific analysis* | Shoreline position through time for Vinh Chau (C), Lai Hoa (D–E) and Nha Mat (H–M) |
| Table | *Table of change rate values* | Median change rate per section and period |
| Save | Last cell | Saves figures and tables to `results/` when `SAVE = True` |

Main functions:

| Function | Part | What it does |
|---|---|---|
| `select_section_transects` | 1 | Selects the transects of a section (within 1 km of the section line) |
| `primary_observations` | 2 | Primary observations of the selected transects |
| `theil_sen_rates` | 2 | Theil–Sen change rate per transect and period, with pooling and 95% CI |
| `flag_position_outliers` | 2 | Temporal and spatial outlier checks (maps only) |
| `build_shorelines` | 2 | Reconstructs a shoreline per year from the transect positions |
| `make_multisection_figure` | 4 | One call makes the full section figure |
| `plot_transect_series` | 5 | Check tool: positions and fits of one transect |
| `make_overview_figure` | Overview | Overview map and profile for one period |
| `plot_sites_through_time` | Sites | Median polish per site, bootstrap band, Theil–Sen per period |
| `section_rate_table` | Table | Median of the transect rates per section and period, with coverage |

## Method in short

**Change rates**
1. Use primary observations only.
2. Pool each transect with its two neighbours (±100 m, about 300 m of coast).
3. Fit a Theil–Sen trend per period. A rate needs a minimum number of observations (`min_obs`).
4. Drop rates with a 95% confidence interval wider than 100 m/year and rates beyond ±200 m/year.
5. Section value = median of the transect rates.
6. For the figures, smooth the rates with a rolling median along the coast.

**Shoreline maps:** primary positions per year are converted to coordinates and connected along the coast. Outliers are removed from the maps only (they stay in the rate calculation, where Theil–Sen limits their influence):
- temporal: > 300 m from the same transect within ±4 years;
- spatial: > 250 m from the neighbouring transects in the same year.

**Site comparison:** median polish (Tukey, 1977) gives one position per site per year. Years with fewer than 10 observed transects are dropped.

## Settings used in the report

| Setting | Section figures | Overview | Sites | Table |
|---|---|---|---|---|
| Periods | 1990–2010, 2010–2025 | 1988–2010, 2010–2025 | 1988–2010, 2010–2025 | 1988–2010, 2010–2025 |
| `min_obs` | 3 | 5 | 5 (min. years per period: 4) | 5 |
| `pool_km` | 0.1 | 0.1 | – | 0.1 |
| `max_ci_width` | 100 m/yr | none | – | 100 m/yr |
| `window_km` | 0.2–3 km (≈10% of section length) | 3 km (gaps > 2 km shown grey) | – | – |
| Other | `min_points=2` | – | `min_transects=10`, `n_boot=200` | `min_coverage=0.5` (else NaN) |

Section groups: D–E (Lai Hoa) and H–K are reported together. L is a channel mouth with only 11 transects.

## Known limitations

- **No tidal correction.** On the gentle mudflat, the tide is the main source of scatter. Some years (e.g. 2005, 2014, 2015) look systematically affected by low tide.
- **Method not designed for muddy, mangrove coasts.** About 98% of the transects are muddy, so the detected waterline is less accurate than on sandy beaches.
- **Low coverage.** On average only about a third of the transects have a primary observation per year. Sections C and N have rates for less than 75% of their transects; N 1988–2010 is not reported (32%).
- **Version differences.** From v1 to v2.1, about 9% of observations changed primary status, which affects the sparse sections G, H–K, L, M and N.
- **2024–2025 composites** are based on fewer images, and in D–E, L and M the shoreline lies 55–170 m seaward of the earlier trend. Treat these years with care.
- **Section G.** Wind turbines are likely detected as shoreline in the western part, so those rates are not interpreted.
- **Structures.** Where the shoreline has reached a sea dike or breakwater, low rates do not mean erosion has slowed.

## References

- Luijendijk, A. et al. (2018). The State of the World's Beaches. *Scientific Reports*, 8, 6641.
- Calkoen, F. et al. (2024). Enabling coastal analytics at planetary scale (CoastPy).
- Theil, H. (1950); Sen, P. K. (1968). Theil–Sen estimator.
- Tukey, J. W. (1977). *Exploratory Data Analysis* (median polish).

Data: Shoreline Monitor v2.1, Deltares. Version information from Arjen Luijendijk (Deltares).