//  General overview of the code provided here:

//  1. The coast is split into boxes of 200 m and a fixed land reference line for each site is drawn.
//  2. Mangrove is classified using MVI and NDVI above a threshold. Only dry-season median composites are used. 
//  3. Per box and period, the mangrove area and seaward edge are measured. This is exported as a CSV table to Google Drive. 

//  User manual:
//  1. Upload shapefiles 'sections' and 'interventions' as assets and replace their paths under INPUT ASSETS. These shapefiles can be found in github.
//  2. Choose a site and a mode under SETTINGS, click Run, then start the exports in the Tasks tab. Repeat for every site and mode. 

//  Modes:
//  'landsat'   -> landsat 5/7/8/9, 3-year periods 1988-2026
//  's2'        -> Sentinel-2, 3-year periods 2018-2026
//  's2_annual' -> Sentinel-2, one dry season per year 2019-2026

//  Note        -> A period is named after its centre year, so that e.g., '2025' = dry seasons 2024-2026 (= December 2023 to April 2026). 

//  SETTINGS 
var site = 'LaiHoa';     // see SITES below
var mode = 'landsat';         // 'landsat', 's2' or 's2_annual'

var export_folder = 'GEE_mangrove_calibrated';
var export_falsecolour = true; // false colour images for the maps (Landsat and s2)
var show_period = 2022;        // period shown on the map as a check (can be adjusted accordingly)

//  INPUT ASSETS
//  replace this with your own paths after uploading the shapefiles
var sections_asset = 'projects/your-project/assets/sections_shapefile';
var interventions_asset = 'projects/your-project/assets/interventions_shapefile';

//  OPTIONAL SETTINGS PER SITE
//  land_m      -> distance of the land line behind the coast (m), default = 500
//  land_m_east -> same, at the other end of the site (tilts the line, if needed), default = land_m
//  sea_m       -> how far the boxes reach seaward of the coast (m), default = 1000
//  skip_start / skip_end -> number of boxes left out at both ends (e.g., where boxes fall outside the coast), default = 0

var SITES = {
  LaiHoa:  {sections: ['Line_4A', 'Line_4B']}, // Note: Line 4 (sections D-E), specifically marked as Lai Hòa. This site was especially important, due to fieldwork campaigns in the year of creating this code. 
  Line_1:  {sections: ['Line_1'], land_m: 1500, skip_start: 2, skip_end: 2},
  Line_2:  {sections: ['Line_2'], land_m: 1500, skip_end: 6},
  Line_3:  {sections: ['Line_3'], land_m: 900, land_m_east: 1500, skip_end: 2},
  Line_5:  {sections: ['Line_5']},
  Line_6:  {sections: ['Line_6'], land_m: 1000},
  Line_7:  {sections: ['Line_7A', 'Line_7B', 'Line_7C', 'Line_7D'], land_m: 1000},
  Line_8:  {sections: ['Line_8'], land_m: 1000},
  Line_9:  {sections: ['Line_9'], land_m: 1000},
  Line_10: {sections: ['Line_10'], land_m: 1000}
};

//  MANGROVE THRESHOLDS per sensor, checked with 512 reference points
//  Landsat: overall accuracy 95.1%, Sentinel-2: 97.7%
var THRESHOLDS = {landsat: {mvi: 4, ndvi: 0.3}, s2: {mvi: 2.75, ndvi: 0.3}};

var bin_m = 200;                                      // box width along the coast (m)
var check_m = 60;                                     // mangrove this close to a box end gives a warning
var max_cloud = 60;                                   // maximum cloud percentage per image
var export_crs = 'EPSG:32648';                        // WGS 84 / UTM zone 48N

//  DERIVED SETTINGS
var sensor = (mode === 'landsat') ? 'landsat' : 's2';
var annual = (mode === 's2_annual');
var scale_m = (sensor === 's2') ? 10 : 30;   // pixel size in metres
var tag = '_' + mode;                         // added to export names

var first_period = (sensor === 's2') ? 2019 : 1989;
var last_period = annual ? 2026 : 2025;
var step = annual ? 1 : 3;
var half_window = annual ? 0 : 1;

var mvi_threshold = THRESHOLDS[sensor].mvi;
var ndvi_threshold = THRESHOLDS[sensor].ndvi;

var land_m = SITES[site].land_m || 500;               
var land_m_east = SITES[site].land_m_east || land_m;  
var sea_m = SITES[site].sea_m || 1000;                


//  INPUT
var sections = ee.FeatureCollection(sections_asset)
  .filter(ee.Filter.inList('Name', SITES[site].sections));

//  Interventions with a short ID: '34A - PRBW [7:LineString]' -> '34A'
var interventions = ee.FeatureCollection(interventions_asset)
  .map(function (f) {
    return f.set('intervention', ee.String(f.get('Name')).split(' ').get(0));
  });

//  HELPER FUNCTIONS
//  Coordinates of a line as a list of [lon, lat]
function coordList(geom) {
  return ee.Array(geom.coordinates().flatten()).reshape([-1, 2]).toList();
}

//  Direction perpendicular to a line, pointing to sea (south-east)
function direction(geom) {
  var coords = coordList(geom);
  var first = ee.List(coords.get(0));
  var last = ee.List(coords.get(-1));
  var mLat = ee.Number(111320);
  var mLon = mLat.multiply(ee.Number(first.get(1)).multiply(Math.PI / 180).cos());
  var dx = ee.Number(last.get(0)).subtract(first.get(0)).multiply(mLon);
  var dy = ee.Number(last.get(1)).subtract(first.get(1)).multiply(mLat);
  var len = dx.hypot(dy);
  var px = dy.divide(len);
  var py = dx.divide(len).multiply(-1);
  var sign = px.gt(py).multiply(2).subtract(1);
  return {px: px.multiply(sign), py: py.multiply(sign), mLon: mLon, mLat: mLat};
}

//  Move coordinates a number of metres (positive = seaward)
function shift(coords, d, metres) {
  var dLon = d.px.multiply(metres).divide(d.mLon);
  var dLat = d.py.multiply(metres).divide(d.mLat);
  return coords.map(function (c) {
    c = ee.List(c);
    return [ee.Number(c.get(0)).add(dLon), ee.Number(c.get(1)).add(dLat)];
  });
}

//  LAND REFERENCE LINE
//  Straight line between the two outermost points of the site, moved landward
var allCoords = coordList(sections.geometry());
var lons = allCoords.map(function (c) { return ee.List(c).get(0); });
var lats = allCoords.map(function (c) { return ee.List(c).get(1); });
var cosLat = ee.Number(lats.get(0)).multiply(Math.PI / 180).cos();
var spanLon = ee.Number(lons.reduce(ee.Reducer.max())).subtract(lons.reduce(ee.Reducer.min())).multiply(cosLat);
var spanLat = ee.Number(lats.reduce(ee.Reducer.max())).subtract(lats.reduce(ee.Reducer.min()));
var sorted = allCoords.sort(ee.List(ee.Algorithms.If(spanLat.gt(spanLon), lats, lons)));
var coast = ee.Geometry.LineString([sorted.get(0), sorted.get(-1)]);
var dCoast = direction(coast);
var west = ee.List(shift(ee.List([sorted.get(0)]), dCoast, -land_m).get(0));
var east = ee.List(shift(ee.List([sorted.get(-1)]), dCoast, -land_m_east).get(0));
var baseline = ee.Geometry.LineString([west, east]);
var d = direction(baseline);                           
var depth_m = Math.max(land_m, land_m_east) + sea_m;   // box length from the land line 

//  BOXES
var cuts = ee.List.sequence(bin_m, baseline.length(1), bin_m);
var pieces = baseline.cutLines(cuts, 1).geometries();

var boxes = ee.FeatureCollection(ee.List.sequence(0, pieces.size().subtract(1)).map(function (i) {
  var piece = ee.Geometry(pieces.get(i));
  var coords = coordList(piece);
  var box = ee.Geometry.Polygon([coords.cat(shift(coords, d, depth_m).reverse())]);

  // Section = nearest section line
  var nearest = ee.Feature(sections.map(function (s) {
    return s.set('dist', s.geometry().distance(box.centroid(1), 1));
  }).sort('dist').first());

  // Intervention = the intervention line with the longest stretch inside this box, else 'none'
  var hits = interventions.filterBounds(box).map(function (iv) {
    return iv.set('len', iv.geometry().intersection(box, 1).length(1));
  }).sort('len', false);
  var intervention = ee.Algorithms.If(hits.size().gt(0), hits.first().get('intervention'), 'none');

  return ee.Feature(box, {
    site: site,
    section: nearest.get('Name'),
    intervention: intervention,
    bin: i,
    x_m: ee.Number(i).multiply(bin_m),   // position along the coast (start of the box)
    piece_m: piece.length(1)             // real length of the box along the coast
  });
}));

var skip_start = SITES[site].skip_start || 0;
var skip_end = SITES[site].skip_end || 0;
boxes = boxes.filter(ee.Filter.and(
  ee.Filter.gte('bin', skip_start),
  ee.Filter.lt('bin', pieces.size().subtract(skip_end))
));

var aoi = boxes.geometry().bounds();

//  LANDSAT
//  Landsat 5/7 and 8/9 use different band numbers; we give them the same names
var BANDS = ['blue', 'green', 'red', 'nir', 'swir1'];
var OLD = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5'];   // Landsat 5 and 7
var NEW = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6'];   // Landsat 8 and 9

//  Remove clouds, cloud shadows and no-data pixels, and convert to reflectance

function prepare(img, bands) {
  var qa = img.select('QA_PIXEL');
  var clear = qa.bitwiseAnd(1 << 0).eq(0)    
    .and(qa.bitwiseAnd(1 << 1).eq(0))        
    .and(qa.bitwiseAnd(1 << 2).eq(0))        
    .and(qa.bitwiseAnd(1 << 3).eq(0))        
    .and(qa.bitwiseAnd(1 << 4).eq(0));       
  var out = img.select(bands, BANDS)
    .multiply(0.0000275).add(-0.2)           
    .updateMask(clear);
  return ee.Image(out.copyProperties(img, ['system:time_start', 'SPACECRAFT_ID']));
}

function loadCollection(id, bands, start, end) {
  return ee.ImageCollection(id)
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.calendarRange(12, 4, 'month'))   // dry season: December to April
    .filter(ee.Filter.lt('CLOUD_COVER', max_cloud))
    .map(function (img) { return prepare(img, bands); });
}

function loadLandsat(start, end) {
  return loadCollection('LANDSAT/LT05/C02/T1_L2', OLD, start, end)
    .merge(loadCollection('LANDSAT/LE07/C02/T1_L2', OLD, start, end))
    .merge(loadCollection('LANDSAT/LC08/C02/T1_L2', NEW, start, end))
    .merge(loadCollection('LANDSAT/LC09/C02/T1_L2', NEW, start, end));
}

//  SENTINEL-2
var S2_BANDS = ['B2', 'B3', 'B4', 'B8', 'B11'];   // blue, green, red, nir, swir1
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');

//  Remove clouds with Cloud Score+

function loadS2(start, end) {
  return ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
    .filterBounds(aoi)
    .filterDate(start, end)
    .filter(ee.Filter.calendarRange(12, 4, 'month'))   // dry season: December to April
    .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', max_cloud))
    .linkCollection(csPlus, ['cs_cdf'])
    .map(function (img) {
      var clear = img.select('cs_cdf').gte(0.6);       
      var out = img.select(S2_BANDS, BANDS)
        .multiply(0.0001)                              
        .updateMask(clear);
      return ee.Image(out.copyProperties(img, ['system:time_start']));
    });
}

//  COMPOSITES AND MANGROVE
//  All images of one period: December before the first dry season to April of the last
function periodCollection(year) {
  var start = ee.Date.fromYMD(year - half_window - 1, 12, 1);
  var end = ee.Date.fromYMD(year + half_window, 5, 1);
  return (sensor === 's2') ? loadS2(start, end) : loadLandsat(start, end);
}

function addIndices(img) {
  var mvi = img.expression('(nir - green) / (swir1 - green)', {
    nir: img.select('nir'), green: img.select('green'), swir1: img.select('swir1')
  }).rename('mvi');
  var ndvi = img.normalizedDifference(['nir', 'red']).rename('ndvi');
  return img.addBands([mvi, ndvi]);
}

function mangroveMask(img) {
  return img.select('mvi').gt(mvi_threshold)
    .and(img.select('ndvi').gt(ndvi_threshold));
}

var periods = [];
for (var y = first_period; y <= last_period; y += step) periods.push(y);

//  Median composite of one period, where an empty period gives a fully masked image
function periodComposite(year) {
  var col = periodCollection(year);
  var empty = ee.Image.constant([0, 0, 0, 0, 0]).rename(BANDS).updateMask(0);
  var img = ee.Image(ee.Algorithms.If(col.size().gt(0), col.median(), empty));
  return addIndices(img).set({period: year, n_images: col.size()});
}

//  MEASURE PER BOX PER PERIOD
var distance = ee.FeatureCollection([ee.Feature(baseline)])
  .distance(depth_m + 500).rename('distance');   // metres to the land reference line
var ha = ee.Image.pixelArea().divide(10000);     
var nearLand = distance.lt(check_m);             
var nearSea = distance.gt(depth_m - check_m);    

function statsForPeriod(year) {
  var img = periodComposite(year);
  var mangrove = mangroveMask(img);

  var areas = ee.Image.cat([
      ha.multiply(mangrove).rename('mangrove_ha'),
      ha.updateMask(img.select('nir').mask()).rename('valid_ha'),
      ha.multiply(mangrove).multiply(nearLand).rename('mangrove_land_ha'),
      ha.multiply(mangrove).multiply(nearSea).rename('mangrove_sea_ha')
    ])
    .reduceRegions({collection: boxes, reducer: ee.Reducer.sum(), scale: scale_m, crs: export_crs, tileScale: 4});

  // Seaward edge is defined as the 95th percentile of the distance of mangrove pixels to the land line
  return distance.updateMask(mangrove)
    .reduceRegions({
      collection: areas,
      reducer: ee.Reducer.percentile({percentiles: [95], maxRaw: 100000}).setOutputs(['edge_m']),
      scale: scale_m, crs: export_crs, tileScale: 4
    })
    .map(function (f) {
      return f.set({period: year, n_images: img.get('n_images')});
    });
}

var columns = ['site', 'section', 'intervention', 'bin', 'x_m', 'piece_m', 'period', 'n_images',
               'mangrove_ha', 'edge_m', 'valid_ha', 'mangrove_land_ha', 'mangrove_sea_ha'];
var table = ee.FeatureCollection(periods.map(statsForPeriod)).flatten()
  .select(columns, null, false);

//  MAP
Map.setOptions('SATELLITE');
Map.centerObject(boxes, 14);
Map.addLayer(periodComposite(show_period), {bands: ['nir', 'red', 'green'], min: 0, max: 0.4},
  'False colour ' + show_period);
periods.forEach(function (year) {
  Map.addLayer(mangroveMask(periodComposite(year)).selfMask(), {palette: ['lime']},
    'Mangrove ' + year, year === show_period);
});
Map.addLayer(ee.Image().paint(boxes, 0, 1), {palette: ['cyan']}, 'Boxes');
Map.addLayer(ee.Image().paint(boxes.filter(ee.Filter.neq('intervention', 'none')), 0, 2),
  {palette: ['magenta']}, 'Boxes with intervention');
Map.addLayer(baseline, {color: 'orange'}, 'Land reference line');
Map.addLayer(sections, {color: 'yellow'}, 'Sections', false);
Map.addLayer(interventions, {color: 'red'}, 'Interventions');

//  CHECKS
print('Site:', site, 'Mode:', mode, 'Thresholds MVI / NDVI:', mvi_threshold, ndvi_threshold);
print('Number of boxes:', boxes.size());
print('Boxes per intervention:', boxes.aggregate_histogram('intervention'));

var imageCounts = ee.FeatureCollection(periods.map(function (year) {
  return ee.Feature(null, {period: year, n_images: periodCollection(year).size()});
}));
print(ui.Chart.feature.byFeature(imageCounts, 'period', ['n_images'])
  .setChartType('ColumnChart')
  .setOptions({title: 'Images per period', hAxis: {format: '####'}, legend: {position: 'none'}}));

//  Mangrove at the ends of a box means the land line or box length should be changed
print('Boxes with > 0.5 ha mangrove near the land line:',
  table.filter(ee.Filter.gt('mangrove_land_ha', 0.5)).size());
print('Boxes with > 0.5 ha mangrove near the seaward end:',
  table.filter(ee.Filter.gt('mangrove_sea_ha', 0.5)).size());

//  EXPORTS
var exportRegion = boxes.geometry().bounds().buffer(300, 10).bounds();

//  1. Table: one row per box and period
Export.table.toDrive({collection: table, description: site + tag + '_mangrove_table',
  folder: export_folder, fileFormat: 'CSV', selectors: columns});

//  2. Boxes (once per site, using Landsat)
if (mode === 'landsat') {
  Export.table.toDrive({collection: boxes, description: site + '_boxes',
    folder: export_folder, fileFormat: 'GeoJSON'});
}

//  3. Mangrove map per period (1 = mangrove, 0 = no mangrove, 255 = no data)
if (!annual) {
  Export.image.toDrive({
    image: ee.Image.cat(periods.map(function (year) {
      return mangroveMask(periodComposite(year)).unmask(255).rename('m' + year);
    })).toByte(),
    description: site + tag + '_mangrove_stack', folder: export_folder,
    region: exportRegion, scale: scale_m, crs: export_crs, maxPixels: 1e9
  });
}

//  4. False colour per period (nir, red, green), used as background for the maps
if (export_falsecolour && !annual) {
  Export.image.toDrive({
    image: ee.Image.cat(periods.map(function (year) {
      return periodComposite(year).select(['nir', 'red', 'green'],
        ['nir_' + year, 'red_' + year, 'green_' + year]);
    })).toFloat(),
    description: site + tag + '_falsecolour_stack', folder: export_folder,
    region: exportRegion, scale: scale_m, crs: export_crs, maxPixels: 1e9
  });
}


//  5. True colour (red, green, blue) of 2024-2026, used as background for figures of sections
if (mode === 's2') {
  Export.image.toDrive({
    image: periodComposite(2025).select(['red', 'green', 'blue'], ['red_2025', 'green_2025', 'blue_2025']).toFloat(),
    description: site + tag + '_truecolour_stack', folder: export_folder,
    region: exportRegion, scale: scale_m, crs: export_crs, maxPixels: 1e9
  });
}