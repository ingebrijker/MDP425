# Annual Longshore Transport 

 The notebook (`scripts/annual_longshore_transport.ipynb`) rebuilds the *"annual longshore transport"* sheet `Littoral.xls` by L.C. van Rijn. The results match the output of those calculations.

## What does the notebook do?

The year is schematised into a number of wave cases, each with an offshore wave height, wave period, wave direction and number of days. For every case the notebook:

1. determines the wave angle relative to the shore normal;
2. transforms the waves from deep water to the breaker line (breaker depth, breaker height, wavelength and breaker angle via Snell's law);
3. computes the wave-driven longshore current (and the effective current including the tide);
4. computes the longshore transport with four formulae:

| Method | Reference |
|---|---|
| Kamphuis (original) | Kamphuis 1991 |
| Kamphuis (modified) | Kamphuis 2013 |
| CERC | CERC formula |
| Van Rijn | Van Rijn 2014 (with tidal current and swell correction) |

The annual **net** and **gross** transport are then summed, plus the two directional values (*Value 1* = negative direction, *Value 2* = positive direction). All volumes are in m³ **including pores**.

## Files

```
sediment/
├── README.md, .gitignore
├── scripts/
│   └── annual_longshore_transport.ipynb      the notebook (with executed cells and plots)
├── data/                                     empty: all input is set in the notebook (section 2)
└── results/                                  figures (.png) and tables (.csv), only saved when SAVE = True
```

Source files (not needed to run the notebook, not included in this repository): `Littoral.xls` (original Excel workbook).
`Littoral.xls` is made by L.C. van Rijn (www.leovanrijn-sediment.com).

## Requirements

The notebook uses `numpy`, `pandas`, `matplotlib`, `jinja2` (for the formatted tables) and `jupyter`. All are in the shared environment of this repository. From the root of the repository:

```bash
conda env create -f environment.yml
conda activate mdp425
```

## Usage

```bash
jupyter notebook scripts/annual_longshore_transport.ipynb
```

Then choose *Run → Run All Cells*. The notebook runs top to bottom and needs no external data files.

**Saving results.** At the top of the notebook, `SAVE = False` (default) only shows the figures and tables. With `SAVE = True` the last cell saves them to `results/` (overwrites the files there):

| File | Content |
|---|---|
| `longshore_transport.png` | Transport per case (all methods) and annual net and gross transport |
| `transport_per_case.csv` | Transport per wave case and method (m³ incl. pores) |
| `annual_net_gross.csv` | Annual net and gross transport per method (m³/yr incl. pores) |

## Notebook structure

1. **Imports**
2. **Input values** – global parameters and wave cases
3. **Wave angle relative to the shore normal**
4. **Wave transformation to the breaker line**
5. **Longshore current**
6. **Longshore transport per case** (four methods)
7. **Annual totals** (net, gross, Value 1 and 2)
8. **Check against the PDF** (with `assert`, tolerance 0.1 %)
9. **Plots** – transport per case and annual net/gross
10. **Use with your own wave climate**
11. **Save figures and tables** – only when `SAVE = True`

## Changing the input

All input is in section 2.

**Global parameters** (red cells at the top of the Excel sheet):

| Variable | Meaning | Unit |
|---|---|---|
| `rho_s` | Sediment density | kg/m³ |
| `rho_bulk` | Bulk density of sand bed | kg/m³ |
| `mud_pct` | Percentage of mud in the bed (0–20) | % |
| `swell_pct` | Percentage of offshore swell (H>1 m, T>10 s), 0–40 | % |
| `u_tide_pos` / `u_tide_neg` | Tidal current velocity (50 % of the time), only used in Van Rijn | m/s |
| `calib` | Calibration factor (default 1) | – |

**Wave cases**: the dictionary `populated` holds, per case number (1–49):
`(days, Hs0, T, wave direction to North, shore normal to North)`.
Unused cases keep the sheet defaults (0 days, `Hs = T = 1e-8`, shore normal 135°). The total number of days must be **365**; the notebook stops with an error otherwise.

The sheet lists shore-normal angles for a number of Dutch locations: IJmuiden 105°, Zandvoort 110°, Noordwijk 120°, Katwijk 125°, Scheveningen 135°, Ter Heijde 135°.

## Sign convention

- Angles are measured with respect to North (direction of wave propagation).
- The wave angle relative to the shore normal is positive if the wave angle to North is larger than the shore-normal angle, and negative otherwise.
- Angles larger than 90° or smaller than −90° (waves travelling away from the coast) are set to 180°; that case then gives no transport.
- Longshore transport in clockwise direction is positive, anti-clockwise is negative.

## Things to be aware of

- **Input from the PDF, not from the Excel file.** The default input in `Littoral.xls` differs from the PDF run (e.g. 0 % mud, 10 % swell, tidal currents of +0.05/−0.1 m/s, d50 = 0.2 mm, tan β = 0.02 and 12 cases). The notebook uses the PDF input because that is the reference output. To reproduce the Excel defaults, change section 2.
- **Constants as in Excel.** The formulas are copied literally, including the rounded values of π (3.141 and 3.1416) and 2π ≈ 6.28, so the results match the sheet.
- **Deviation from the PDF.** The totals differ from the PDF by less than about 0.001 %; the PDF shows rounded values.
- **Van Rijn total in Excel.** In the sheet the Van Rijn total sums cases 1–48 only (case 49 is skipped). Case 49 has 0 days, so this does not change the result.
- **Swell percentage.** The PDF shows `0,4` for "Percentage of offshore swell (0 to 40 %)"; this was taken as 0.4 %. Check this when using your own input.

## Reference results (PDF, m³/year incl. pores)

| Method | Net | Gross |
|---|---|---|
| Kamphuis 1991 | −6,964.6 | 12,655.2 |
| Kamphuis 2013 | −3,518.8 | 6,269.7 |
| CERC | −91,632.4 | 242,096.9 |
| Van Rijn 2014 | −16,849.3 | 39,367.8 |
