// main.js - D3 choropleth + linked bar chart + interactions
// Data contract:
// CSV: state,value  (state names must match GeoJSON feature.properties.name)
// GeoJSON: US states (PublicaMundi dataset) excluding Puerto Rico

// Refactored for D3 v4 (removed Promise.all & selection.join, adjusted event handling)
(function() {
  var mapSelector = '#map';
  var barSelector = '#bars';
  var tooltip = d3.select('#tooltip');
  var legendContainer = d3.select('#legend');
  var detailsBox = d3.select('#details');
  var schemeSelect = d3.select('#color-scheme');

  var geoJsonURL = 'https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json';
  var csvURL = 'data/states_data.csv';

  var width = 960;
  var height = 600;

  var svg = d3.select(mapSelector)
    .attr('viewBox', '0 0 ' + width + ' ' + height)
    .attr('preserveAspectRatio', 'xMidYMid meet');

  var gMap = svg.append('g').attr('class', 'map-layer');

  var zoom = d3.zoom()
    .scaleExtent([1, 8])
    .on('zoom', function() { gMap.attr('transform', d3.event.transform); });
  svg.call(zoom);

  // Color scheme mapping (d3-scale-chromatic loaded separately)
  var schemes = {
    Blues: d3.schemeBlues[9],
    Greens: d3.schemeGreens[9],
    Oranges: d3.schemeOranges[9],
    Purples: d3.schemePurples[9],
    Reds: d3.schemeReds[9],
    Greys: d3.schemeGreys[9],
    BuGn: d3.schemeBuGn[9],
    OrRd: d3.schemeOrRd[9],
    YlGnBu: d3.schemeYlGnBu[9],
    Viridis: [
      d3.interpolateViridis(0.1),
      d3.interpolateViridis(0.2),
      d3.interpolateViridis(0.3),
      d3.interpolateViridis(0.4),
      d3.interpolateViridis(0.5),
      d3.interpolateViridis(0.6),
      d3.interpolateViridis(0.7),
      d3.interpolateViridis(0.8),
      d3.interpolateViridis(0.9)
    ]
  };

  var savedScheme = localStorage.getItem('colorScheme') || 'Blues';
  schemeSelect.property('value', savedScheme);

  var geo, rows, extent, projection, path, dataByState, values, colorScale;

  // Load data using nested callbacks (v4 style)
  d3.json(geoJsonURL, function(err, geoData) {
    if (err) throw err;
    d3.csv(csvURL, function(row) { return { state: row.state, value: +row.value }; }, function(err2, rowData) {
      if (err2) throw err2;
      init(geoData, rowData);
    });
  });

  function init(geoData, rowData) {
  geo = geoData;
  rows = rowData;
  // Build a simple state -> numeric value map (previous version stored whole row objects causing NaN in color scale)
  dataByState = d3.map();
  rows.forEach(function(d){ dataByState.set(d.state, +d.value); });
  values = rows.map(function(d){ return +d.value; }).filter(function(v){ return !isNaN(v); });
    extent = d3.extent(values);

    projection = d3.geoAlbersUsa().fitSize([width, height], geo);
    path = d3.geoPath().projection(projection);

    geo.features.forEach(function(f){
      var name = f.properties.name;
      var val = dataByState.get(name);
      f.properties.value = (val == null || isNaN(val)) ? null : +val;
    });

    renderMap();
    buildBars(rows);

    schemeSelect.on('change', function() {
      var scheme = this.value;
      localStorage.setItem('colorScheme', scheme);
      updateColors(scheme);
    });
  }

  function renderMap() {
    var scheme = schemeSelect.property('value');
    colorScale = d3.scaleQuantize().domain(extent).range(schemes[scheme]);

    var states = gMap.selectAll('path.state').data(geo.features);
    states.enter().append('path')
      .attr('class','state')
      .attr('d', path)
      .attr('fill', function(d){ var v = d.properties.value; return v == null ? '#333' : colorScale(v); })
      .on('mouseenter', function(d){ focusState(d, true); showTooltip(d); })
      .on('mousemove', function(d){ showTooltip(d); })
      .on('mouseleave', function(d){ focusState(d, false); hideTooltip(); })
      .on('click', function(d){
        var b = path.bounds(d), x0=b[0][0], y0=b[0][1], x1=b[1][0], y1=b[1][1];
        d3.event.stopPropagation();
        svg.transition().duration(750).call(
          zoom.transform,
          d3.zoomIdentity.translate(width/2, height/2).scale(Math.min(8, 0.9 / Math.max((x1-x0)/width, (y1-y0)/height))).translate(-(x0+x1)/2, -(y0+y1)/2)
        );
        detailsBox.html('<strong>' + d.properties.name + '</strong><br>Value: ' + formatValue(d.properties.value));
      });

    svg.on('click', function(){
      svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
    });

    buildLegend(colorScale, extent, scheme);
  }

  function updateColors(scheme) {
    colorScale = d3.scaleQuantize().domain(extent).range(schemes[scheme]);
    gMap.selectAll('path.state')
      .transition().duration(500)
      .attr('fill', function(d){ var v = d.properties.value; return v == null ? '#333' : colorScale(v); });
    buildLegend(colorScale, extent, scheme);
  }

  function formatValue(v) {
    if (v == null || isNaN(v)) return 'N/A';
    // Format large numbers with commas
    return d3.format(',')(v);
  }

  // Tooltip functions (use d3.event in v4)
  function showTooltip(d) {
    var pageX = d3.event.pageX, pageY = d3.event.pageY;
    tooltip.classed('hidden', false).classed('visible', true)
      .html('<strong>' + d.properties.name + '</strong><br/>Value: ' + formatValue(d.properties.value))
      .style('left', (pageX + 12) + 'px')
      .style('top', (pageY - 28) + 'px');
  }

  function hideTooltip() {
    tooltip.classed('visible', false).classed('hidden', true);
  }

  function focusState(d, on) {
    d3.selectAll('.state').classed('focused', function(f){ return f === d && on; });
    d3.selectAll('.bar').classed('focused', function(b){ return b.state === d.properties.name && on; });
  }

  function buildLegend(color, extent, scheme) {
    legendContainer.html('');
    legendContainer.append('div').attr('class','legend-title').text('Value scale (' + scheme + ')');
    var scaleValues = color.range().map(function(c){
      var d = color.invertExtent(c);
      return { color: c, lo: Math.round(d[0]), hi: Math.round(d[1]) };
    });
    scaleValues.forEach(function(s){
      var row = legendContainer.append('div').attr('class','swatch-row');
      row.append('div').attr('class','swatch').style('background', s.color);
      row.append('div').text(d3.format(',')(s.lo) + ' – ' + d3.format(',')(s.hi));
    });
    legendContainer.append('div').style('margin-top','0.25rem').text('Min: ' + d3.format(',')(extent[0]) + '  Max: ' + d3.format(',')(extent[1]));
    legendContainer.append('div').style('opacity',0.6).text('Click a state to zoom. Click background to reset.');
  }

  function buildBars(rows) {
    var top = rows.slice().sort(function(a,b){ return d3.descending(a.value, b.value); }).slice(0, 10);
    var barSvg = d3.select(barSelector)
      .attr('viewBox', '0 0 320 300')
      .attr('preserveAspectRatio','xMidYMid meet');
    var bw = 320, bh = 300, margins = { top: 20, right: 10, bottom: 80, left: 70 };
    var innerW = bw - margins.left - margins.right;
    var innerH = bh - margins.top - margins.bottom;
    var g = barSvg.append('g').attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');

    var x = d3.scaleBand().domain(top.map(function(d){ return d.state; })).range([0, innerW]).padding(0.12);
    var y = d3.scaleLinear().domain([0, d3.max(top, function(d){ return d.value; })]).nice().range([innerH, 0]);

    var bars = g.selectAll('rect.bar').data(top);
    bars.enter().append('rect')
      .attr('class','bar')
      .attr('x', function(d){ return x(d.state); })
      .attr('y', function(d){ return y(d.value); })
      .attr('width', x.bandwidth())
      .attr('height', function(d){ return innerH - y(d.value); })
      .on('mouseenter', function(d){
        d3.selectAll('.bar').classed('focused', function(b){ return b === d; });
        d3.selectAll('.state').classed('focused', function(s){ return s.properties.name === d.state; });
        detailsBox.html('<strong>' + d.state + '</strong><br>Value: ' + formatValue(d.value));
      })
      .on('mouseleave', function(){
        d3.selectAll('.bar').classed('focused', false);
        d3.selectAll('.state').classed('focused', false);
      });

    var xAxis = d3.axisBottom(x);
    var yAxis = d3.axisLeft(y).ticks(5).tickFormat(d3.format('~s'));
    g.append('g').attr('class','axis axis-x').attr('transform', 'translate(0,' + innerH + ')').call(xAxis)
      .selectAll('text').attr('transform','rotate(-65) translate(-6,-2)').style('text-anchor','end');
    g.append('g').attr('class','axis axis-y').call(yAxis);
    g.append('text').attr('x', innerW/2).attr('y', -6).attr('text-anchor','middle').attr('fill','#ccc').style('font-size','0.7rem').text('Top 10 States by Value');
  }
})();
