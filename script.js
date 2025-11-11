// script.js — choropleth demo for US states median household income

const width = 960;
const height = 600;

const svg = d3.select('#map')
  .attr('viewBox', `0 0 ${width} ${height}`)
  .attr('preserveAspectRatio', 'xMidYMid meet');

const tooltip = d3.select('#tooltip');

const projection = d3.geoAlbersUsa()
  .translate([width / 2, height / 2])
  .scale(1100);

const path = d3.geoPath().projection(projection);

// Color scale with high contrast - using Viridis for better visibility
const color = d3.scaleSequential()
  .interpolator(d3.interpolateViridis);

// Data files
const geojsonRemoteURL = 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json';
const geojsonLocalFallback = 'us-states-temp.json';
const dataCSV = 'data/states_data.csv';

// Helper to load GeoJSON with fallback if remote incomplete or fails
function loadGeoJSONWithFallback() {
  return d3.json(geojsonRemoteURL).then(remote => {
    if (!remote || !remote.features || remote.features.length < 50) {
      console.warn('Remote GeoJSON suspicious (features:', remote?.features?.length, ') – trying local fallback');
      return d3.json(geojsonLocalFallback).then(local => {
        console.log('Loaded local fallback GeoJSON with features:', local.features.length);
        return local;
      }).catch(err => {
        console.error('Local fallback failed:', err);
        return remote; // return whatever we had
      });
    }
    return remote;
  }).catch(err => {
    console.warn('Remote GeoJSON failed, attempting local fallback...', err);
    return d3.json(geojsonLocalFallback);
  });
}

Promise.all([
  loadGeoJSONWithFallback(),
  d3.csv(dataCSV)
]).then(([geo, data]) => {
  const debugDiv = d3.select('#debug');
  console.log('=== DATA LOADING VERIFICATION ===');
  console.log('GeoJSON features loaded:', geo.features.length);
  console.log('CSV rows loaded:', data.length);
  console.log('First 3 CSV rows:', data.slice(0, 3));
  
  // prepare data lookup by state name
  const valueByName = new Map();
  data.forEach(d => {
    d.value = d.value === '' ? NaN : +d.value;
    valueByName.set(d.state, d.value);
  });

  console.log('Value map created with', valueByName.size, 'entries');
  console.log('Sample values:', Array.from(valueByName.entries()).slice(0, 5));

  // get value array to set domain
  const values = data.map(d => d.value).filter(v => !isNaN(v));
  const vmin = d3.min(values);
  const vmax = d3.max(values);
  
  console.log('Value range: $' + vmin.toLocaleString() + ' - $' + vmax.toLocaleString());
  debugDiv.text(`Geo features: ${geo.features.length}\nCSV rows: ${data.length}\nValue range: $${vmin.toLocaleString()} - $${vmax.toLocaleString()}`);
  
  // Set domain for color scale
  color.domain([vmin, vmax]);

  // Draw states
  const g = svg.append('g');
  
  let matchedStates = 0;
  let unmatchedStates = [];
  
  const stateSelection = g.selectAll('path')
    .data(geo.features, d => d.properties.name)
    .join('path')
      .attr('class', 'state')
      .attr('d', path)
      .attr('fill', d => {
        const val = valueByName.get(d.properties.name);
        if (val == null || isNaN(val)) {
          unmatchedStates.push(d.properties.name);
          return '#eee';
        } else {
          matchedStates++;
          return color(val);
        }
      })
      .on('mousemove', (event, d) => {
        const val = valueByName.get(d.properties.name);
        const formattedVal = isNaN(val) ? 'N/A' : d3.format('$,.0f')(val);
        tooltip
          .style('left', (event.pageX + 12) + 'px')
          .style('top', (event.pageY + 12) + 'px')
          .classed('hidden', false)
          .html(`<strong>${d.properties.name}</strong><br/>Median Income: ${formattedVal}`);
        d3.select(event.currentTarget).classed('hover', true);
      })
      .on('mouseout', (event) => {
        tooltip.classed('hidden', true);
        d3.select(event.currentTarget).classed('hover', false);
      })
      .on('click', (event, d) => {
        // zoom to state on click
        const [[x0, y0], [x1, y1]] = path.bounds(d);
        event.stopPropagation();
        svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity
          .translate(width / 2, height / 2)
          .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
          .translate(-(x0 + x1) / 2, -(y0 + y1) / 2));
      });

  // Add zoom behavior
  const zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', (event) => {
      g.attr('transform', event.transform);
    });

  svg.call(zoom);
  
  // Reset zoom on background click
  svg.on('click', () => {
    svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
  });

  console.log('=== MATCHING RESULTS ===');
  console.log('States matched with data:', matchedStates);
  console.log('States WITHOUT data:', unmatchedStates.length);
  if (unmatchedStates.length > 0) {
    console.log('Unmatched state names:', unmatchedStates);
  }
  console.log('========================');
  debugDiv.text(debugDiv.text() + `\nMatched states: ${matchedStates}\nUnmatched states: ${unmatchedStates.length}${unmatchedStates.length? '\nList: ' + unmatchedStates.join(', '): ''}`);

  if (matchedStates < 49) {
    debugDiv.style('background', '#fff3cd').style('border-color','#ffc107');
  } else {
    debugDiv.style('background', '#e7f8ec').style('border-color','#4caf50');
  }

  // Create legend
  createLegend(vmin, vmax);

}).catch(err => {
  console.error('Error loading data', err);
  alert('Error loading map or data. Open console for details.');
});

function createLegend(min, max) {
  const legend = d3.select('#legend');
  const steps = 7;
  const range = d3.range(steps).map(i => min + (i / (steps - 1)) * (max - min));
  
  legend.html('<strong>Median Household Income ($)</strong>');
  
  const items = legend.selectAll('.legend-item')
    .data(range)
    .join('div')
    .attr('class', 'legend-item');
  
  items.html(d => 
    `<span style="display:inline-block;width:30px;height:14px;background:${color(d)};margin-right:8px;border:1px solid #ccc;vertical-align:middle"></span>${d3.format('$,.0f')(d)}`
  );
  
  legend.append('div')
    .style('margin-top','12px')
    .style('font-size', '13px')
    .style('color', '#666')
    .html('<em>Hover states for details. Click a state to zoom in, click background to reset. Data: US Census Bureau ACS 2023 estimates.</em>');
}
