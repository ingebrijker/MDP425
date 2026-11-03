# Topography Lai Hoa: cross-shore profile and erosional cliffs

Code for the topography analysis at Lai Hoa (Can Tho, former Soc Trang). Calculated are the slopes of the
cross-shore profile (healthy mangrove, unhealthy mangrove and the mudflat in front of the breakwater) and the
steepness of the erosional cliffs, from RTK-GPS points measured during the fieldwork in October 2026.

## Contents

```
topology/
├── README.md, .gitignore
├── scripts/
│   └── topology_analysis.ipynb      slopes, cliffs and figures
├── data/                            RTK-GPS points (laihoa.csv) – not on GitHub, see below
└── results/
    ├── figures/                     figures (.png), only saved when SAVE = True
    └── tables/                      tables (.csv), only saved when SAVE = True
```

## Data

The RTK-GPS points were collected together with ICOE and are not included in this repository (`data/` is in
`.gitignore`). The notebook expects `data/laihoa.csv` with the columns: id, northing, easting, elevation, code
(VN-2000 coordinates, elevation in m).

## Run the notebook

1. Install the shared environment of this repository. From the root of the repository:

   ```bash
   conda env create -f environment.yml
   conda activate mdp425
   ```

2. Put `laihoa.csv` in `data/`.
3. Open `scripts/topology_analysis.ipynb` and run all cells (*Restart & Run All*).

The notebook runs from `scripts/` and uses relative paths, set in the first code cell:

```python
SAVE = False   # True = save the figures and tables in results/ (overwrites the files there)

path = '../data/laihoa.csv'
fig_dir = '../results/figures'
table_dir = '../results/tables'
```

With `SAVE = False` (the default) the notebook only shows the figures and tables, so the versions in `results/`
(the ones used in the report) stay unchanged. With `SAVE = True` they are saved to `results/figures/` and
`results/tables/`. No data are written.