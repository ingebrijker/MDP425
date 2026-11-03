# Mangrove belt width and seaward edge along the coast of Can Tho and Ca Mau (former Soc Trang and Bac Lieu), sections A–N

Code and data for the mangrove analysis of the MDP425 report: the mangrove belt width and the position and
change rate of the seaward mangrove edge along the coast, from 1988 to 2026, based on Landsat and Sentinel-2.

## Contents

```
mangrove_analysis/
├── scripts/
│   ├── mangrove_analysis.ipynb      analysis of mangrove development in study area and creates all mangrove figures and tables
│   └── gee_scripts/                 Google Earth Engine scripts where the data was obtained
│       ├── mangrove_boxes.js        mangrove per 200 m box and period (Landsat and Sentinel-2)
│       ├── reference_points.js      MVI and NDVI at the 512 reference points (threshold calibration)
│       └── study_area.js            study area map (Landsat true colour with mangrove)
├── data/
│   ├── shapefiles/                  input for GEE: coast sections (WGS 84); interventions not included, see below
│   ├── gee_data_landsat/            GEE output, Landsat (one folder per site)
│   ├── gee_data_s2/                 GEE output, Sentinel-2 (one folder per site)
│   ├── gee_data_calibration/        MVI and NDVI at the reference points (Landsat and Sentinel-2)
│   └── gee_data_study_area/         study area images (Landsat true colour with mangrove)
└── results/
    ├── figures/                     output of the notebook
    └── tables/                      output of the notebook
```

Sites (as named in GEE) and sections: Line_1 = A, Line_2 = B, Line_3 = C, LaiHoa = D–E, Line_5 = F,
Line_6 = G, Line_7 = H–K, Line_8 = L, Line_9 = M, Line_10 = N.

Periods are named by their middle year: period 2025 = the dry seasons (December–April) of 2024–2026.

## Run the notebook

1. Install the Python packages with the shared environment of this repository. From the root of the repository: `conda env create -f environment.yml` and `conda activate mdp425`.
2. Open `scripts/mangrove_analysis.ipynb` and run all cells.

The figures and tables are saved in `results/figures/` and `results/tables/`. The first run downloads the Esri background images
(internet needed); they are saved in `data/gee_data_s2/<site>/` and are not part of this repository.

## Make the data again (optional)

The data in the `data/gee_data_...` folders can be made again in the Google Earth Engine Code Editor:

1. Upload `data/shapefiles/sections.shp` and `interventions.shp` as table assets and replace the asset
   paths at the top of the scripts with your own. `interventions.shp` is not in this repository: it is based on the
   ICOE inventory of coastal interventions and is not ours to share (ask ICOE).
2. `mangrove_boxes.js`: run per site and per mode (`landsat`, `s2`, `s2_annual`). Put the Landsat exports in
   `data/gee_data_landsat/<site>/` and the Sentinel-2 exports in `data/gee_data_s2/<site>/`.
3. `reference_points.js`: draw or import the two point layers `mangrove` and `other` (the points are in
   `calibration_landsat.csv` and `calibration_s2.csv`). Put the exports in `data/gee_data_calibration/`.
4. `study_area.js`: put the exports (`intro_mangrove_<period>.tif`) in `data/gee_data_study_area/`.

## Data sources and credits

- Landsat 5, 7, 8 and 9 Collection 2 Level-2: courtesy of the U.S. Geological Survey.
- Sentinel-2: contains modified Copernicus Sentinel data (2018–2026). Cloud masking with Cloud Score+ (Google).
- Background images in the section figures: Esri World Imagery (Esri, i-cubed, USDA, USGS, AEX, GeoEye,
  Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community). Not included in this repository.
- Coast sections (A–N): made by the authors of this project.
- Intervention locations: based on the ICOE inventory of coastal interventions (ICOE, 2026). Not included in this
  repository.