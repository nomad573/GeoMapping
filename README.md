# GeoMapping
David's Homework

## Interactive Choropleth: Median Household Income by State

This repository is a complete D3 choropleth visualization mapping **median household income** across all 50 US states (2023 Census estimates).

**Features:**
- Loads GeoJSON for US states (from a public URL)
- Loads a local CSV (`data/states_data.csv`) with median household income for all 50 states
- Renders a choropleth with:
  - Color scale (YlGnBu interpolator, tuned for income range $52,985–$98,461)
  - Hover tooltip showing state name and formatted income value
  - Click-to-zoom on individual states
  - Click background to reset zoom
  - Legend with 7 color steps

**Files included:**
- `index.html` — demo page
- `styles.css` — enhanced styles and tooltip
- `script.js` — D3 code; load geojson + CSV, join, color scale, interactions
- `data/states_data.csv` — **full 50-state dataset** with median household income

## How to run

1. Start a simple HTTP server from the project root (browsers block file:// XHR):

   **With Python 3 (Windows PowerShell):**

```powershell
python -m http.server 8000
```

   Then open http://localhost:8000 in your browser.

2. The map will load automatically. Hover over states to see income values, click to zoom, click background to reset.

## Data sources

- **Geodata (GeoJSON):**
  - US states GeoJSON: https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json
  - For higher-quality or different regions consider: Natural Earth, US Census TIGER/Line (shapefiles), or world-atlas TopoJSON.

- **Content data:**
  - Median household income values are from US Census Bureau American Community Survey (ACS) 2023 estimates
  - Data range: $52,985 (Mississippi) to $98,461 (Maryland)

## Modifying the dataset

To swap in your own data, replace `data/states_data.csv` with a CSV that has two columns:
- `state` (matching the `name` property in the GeoJSON exactly)
- `value` (numeric)

Example header:
```
state,value
California,91905
Texas,73035
...
```

**Join key note:** The demo joins by `state` (string name). If your GeoJSON has an ISO code or FIPS id, it's better to join on those numeric codes to avoid mismatches. Update the join logic in `script.js` at line `valueByName.set(...)`.

## Converting geodata to GeoJSON

If you have shapefiles or other formats:

**Using ogr2ogr (GDAL):**
```powershell
ogr2ogr -f GeoJSON out.geojson in.shp
```

**Using mapshaper (npm or web):**
```powershell
npx mapshaper in.shp -simplify 10% -o format=geojson out.geojson
```

## Color scale tuning

The color scale uses `d3.interpolateYlGnBu` (yellow-green-blue), which provides good contrast for continuous numeric data. Domain is set automatically from the data min/max.

To change the color scheme, edit `script.js`:
```javascript
const color = d3.scaleSequential()
  .interpolator(d3.interpolateYlGnBu);  // Try: interpolateViridis, interpolateRdYlGn, etc.
```

See D3 color schemes: https://github.com/d3/d3-scale-chromatic

## Extra credit ideas

- Convert regional shapefiles to GeoJSON yourself and include them locally
- Map multiple attributes with small multiples or linked charts
- Add filter controls, histogram, or time-series slider
- Export map as PNG/SVG
- Add accessibility enhancements (keyboard navigation, ARIA labels)

## Assignment reference

Based on Murray, S., *Interactive Data Visualization for the Web: An Introduction to Designing with D3*, Second Edition, Chapter 14.

