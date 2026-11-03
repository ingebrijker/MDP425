//  General overview of the code provided here:
//  The mangrove thresholds (MVI and NDVI) were checked with 512 reference points (256 mangrove, 256 other), labelled by visual interpretation of high-resolution imagery. 
//  This script extracts the MVI and NDVI at these points from the Landsat and Sentinel-2 composites of period 2025 (dry seasons 2024-2026).
//  Exports are made as CSV. 
//  The thresholds and accuracies are calculated in Python.

//  Note -> the reference points were drawn in GEE as two imports: 'mangrove' and 'other'.
//  Their coordinates, class and MVI/NDVI values are in calibration_landsat.csv and calibration_s2.csv (see GitHub). 
//  To run this script yourself, first draw or import two point layers with these names.

//  SETTINGS
var export_folder = 'GEE_mangrove_calibrated';
var max_cloud = 60;
var start = ee.Date.fromYMD(2023, 12, 1);   // period 2025 = December 2023 to April 2026
var end = ee.Date.fromYMD(2026, 5, 1);

//  REFERENCE POINTS
//  class 1 = mangrove, 0 = other; random number (seed 42) for the calibration / validation split
var points = mangrove.map(function (f) { return f.set('class', 1); })
  .merge(other.map(function (f) { return f.set('class', 0); }))
  .randomColumn('random', 42);
var aoi = points.geometry().bounds();

//  LANDSAT (same as mangrove_boxes.js)
var BANDS = ['blue', 'green', 'red', 'nir', 'swir1'];
var OLD = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5'];   // Landsat 5 and 7
var NEW = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6'];   // Landsat 8 and 9

function prepare(img, bands) {
  var qa = img.select('QA_PIXEL');
  var clear = qa.bitwiseAnd(1 << 0).eq(0)
    .and(qa.bitwiseAnd(1 << 1).eq(0))
    .and(qa.bitwiseAnd(1 << 2).eq(0))
    .and(qa.bitwiseAnd(1 << 3).eq(0))
    .and(qa.bitwiseAnd(1 << 4).eq(0));
  return img.select(bands, BANDS).multiply(0.0000275).add(-0.2).updateMask(clear);
}

function loadCollection(id, bands) {
  return ee.ImageCollection(id)
    .filterBounds(aoi).filterDate(start, end)
    .filter(ee.Filter.calendarRange(12, 4, 'month'))   // dry season: December to April
    .filter(ee.Filter.lt('CLOUD_COVER', max_cloud))
    .map(function (img) { return prepare(img, bands); });
}

var landsat = loadCollection('LANDSAT/LT05/C02/T1_L2', OLD)
  .merge(loadCollection('LANDSAT/LE07/C02/T1_L2', OLD))
  .merge(loadCollection('LANDSAT/LC08/C02/T1_L2', NEW))
  .merge(loadCollection('LANDSAT/LC09/C02/T1_L2', NEW));

//  SENTINEL-2 (same as mangrove_boxes.js)
var csPlus = ee.ImageCollection('GOOGLE/CLOUD_SCORE_PLUS/V1/S2_HARMONIZED');
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED')
  .filterBounds(aoi).filterDate(start, end)
  .filter(ee.Filter.calendarRange(12, 4, 'month'))
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', max_cloud))
  .linkCollection(csPlus, ['cs_cdf'])
  .map(function (img) {
    return img.select(['B2', 'B3', 'B4', 'B8', 'B11'], BANDS)
      .multiply(0.0001).updateMask(img.select('cs_cdf').gte(0.6));
  });

//  MVI AND NDVI AT THE POINTS
function indices(col) {
  var img = col.median();
  var mvi = img.expression('(nir - green) / (swir1 - green)', {
    nir: img.select('nir'), green: img.select('green'), swir1: img.select('swir1')
  }).rename('mvi');
  var ndvi = img.normalizedDifference(['nir', 'red']).rename('ndvi');
  return mvi.addBands(ndvi);
}

function sample(col, scale) {
  return indices(col).sampleRegions({
    collection: points, properties: ['class', 'random'],
    scale: scale, projection: 'EPSG:32648', geometries: true
  });
}

var samplesLandsat = sample(landsat, 30);
var samplesS2 = sample(s2, 10);

//  CHECKS
print('Points: mangrove', mangrove.size(), 'other', other.size());
print('Images: Landsat', landsat.size(), 'Sentinel-2', s2.size());
print('Points with data: Landsat', samplesLandsat.size(), 'Sentinel-2', samplesS2.size());

function scatter(samples, title) {
  return ui.Chart.feature.groups(samples, 'mvi', 'ndvi', 'class')
    .setChartType('ScatterChart')
    .setOptions({title: title + ' (1 = mangrove, 0 = other)',
      hAxis: {title: 'MVI', viewWindow: {min: -2, max: 12}}, vAxis: {title: 'NDVI'}, pointSize: 3});
}
print(scatter(samplesLandsat, 'Landsat'));
print(scatter(samplesS2, 'Sentinel-2'));

//  EXPORTS
var cols = ['class', 'random', 'mvi', 'ndvi', '.geo'];
Export.table.toDrive({collection: samplesLandsat, description: 'calibration_landsat',
  folder: export_folder, fileFormat: 'CSV', selectors: cols});
Export.table.toDrive({collection: samplesS2, description: 'calibration_s2',
  folder: export_folder, fileFormat: 'CSV', selectors: cols});