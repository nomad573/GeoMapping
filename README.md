# US States Choropleth Visualization

Interactive D3 visualization that joins a custom CSV of state-level values with a US States GeoJSON to produce:

1. Choropleth map (color encodes the numeric `value` field).
2. Linked Top-10 bar chart.
3. Interactions: hover tooltip, zoom/pan (click state to zoom, click background to reset), cross-highlighting between map and bars.

## Data Sources

- `data/states_data.csv` (provided in this repository) — columns: `state,value`.
- GeoJSON fetched at runtime from PublicaMundi MappingAPI (`us-states.json`).

> Puerto Rico exists in the CSV but the referenced GeoJSON does not include it, so it renders only in the bar chart if included in Top 10 (currently not, due to low value).

## Project Structure

```text
index.html          # Main page
css/style.css       # Styles for map, bars, legend, tooltip
js/main.js          # D3 logic: load, merge, render, interactions
data/states_data.csv# Content data
README.md           # Documentation
```

## Running Locally

You need a simple static server (required because browsers block local file CSV fetches). Options:

### Option A: VS Code Live Server Extension (recommended)

1. Install Live Server extension.
2. Right-click `index.html` → "Open with Live Server".

### Option B: Python (ensure Python is installed)

If you had exit code 1 previously, confirm Python is on PATH: `python --version`.

```pwsh
python -m http.server 8000
# Then visit: http://localhost:8000/index.html
```

### Option C: Node.js http-server

```pwsh
npm install -g http-server
http-server -p 8000
```

## Customization

- Change color scheme: replace `d3.schemeBlues[9]` with another e.g. `d3.schemeOrRd[9]`.
- Adjust legend bins: switch to quantile (`d3.scaleQuantile()`) or sequential scale.
- Add more interactions: selection filters, a side panel with trends, or mini sparkline per state.
- Add second dataset: load another CSV and encode circles or add choropleth compare toggle.

## Potential Enhancements

- Accessibility improvements: add `aria-describedby` links, keyboard focus management.
- Data provenance tooltip: include source & year if known.
- Export functionality: button to download SVG as PNG.
- Additional chart: histogram of all values, or small multiples over time if timeseries added.

## Notes

Assumes that `value` is a comparable numeric metric (e.g., income, population per capita, index). If semantic meaning is known, update labels and legend title accordingly.

---
Built with D3 v4 + d3-scale-chromatic.

### D3 Version Notes (v4 adjustments)

- Data loading uses nested callbacks (`d3.json` then `d3.csv`) instead of `Promise.all`.
- Event handling uses `d3.event` (e.g., `d3.event.transform` inside zoom) instead of passed event parameter.
- No `selection.join`; replaced with explicit `enter()` pattern for states and bars.
- Color schemes provided by including the extra script `d3-scale-chromatic.v1.min.js`.
- Other APIs (projections, paths, scales, axes, transitions) remain the same between v4 and v7 for this use case.
