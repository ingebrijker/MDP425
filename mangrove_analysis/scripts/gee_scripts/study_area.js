//  General overview of the code provided here:
//  Study area map: Landsat true colour with mangrove (green) along the whole coast, for four periods.
//  Mangrove is classified with the same method as mangrove_boxes.js (MVI > 4 and NDVI > 0.3), only within 3 km of the sections.
//  Exports one RGB image per period: intro_mangrove_<period>.tif (used in notebooks/1_mangrove_analysis.ipynb).
//  Periods are named by their centre year: 2025 = dry seasons 2024-2026 (December 2023 to April 2026).

//  SETTINGS
var periods = [1989, 2001, 2013, 2025];
var mvi_threshold = 4;
var ndvi_threshold = 0.3;
var coast_buffer_m = 3000;   // only classify within 3 km of the sections
var mangrove_colour = '#00c853';
var vis = {bands: ['red', 'green', 'blue'], min: 0, max: 0.2, gamma: 1.2};
var max_cloud = 60;
var export_folder = 'GEE_mangrove_calibrated';
var export_crs = 'EPSG:32648';   // WGS 84 / UTM zone 48N

//  INPUT: replace with your own asset (shapefile in data/shapefiles/)
var sections = ee.FeatureCollection('projects/your-project/assets/sections_shapefile');
var region = sections.geometry().bounds().buffer(4000).bounds();
var coastZone = sections.geometry().buffer(coast_buffer_m);

//  LANDSAT (same as mangrove_boxes.js)
var BANDS = ['blue', 'green', 'red', 'nir', 'swir1'];
var OLD = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5'];   // Landsat 5 and 7
var NEW = ['SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6'];   // Landsat 8 and 9

function prepare(img, bands) {
  var clear = img.select('QA_PIXEL').bitwiseAnd(31).eq(0);   // bits 0-4: fill, dilated cloud, cirrus, cloud, shadow
  return img.select(bands, BANDS).multiply(0.0000275).add(-0.2).updateMask(clear);
}

function loadCollection(id, bands, start, end) {
  return ee.ImageCollection(id)
    .filterBounds(region)
    .filterDate(start, end)
    .filter(ee.Filter.calendarRange(12, 4, 'month'))   // dry season: December to April
    .filter(ee.Filter.lt('CLOUD_COVER', max_cloud))
    .map(function (img) { return prepare(img, bands); });
}

function composite(year) {
  var start = ee.Date.fromYMD(year - 2, 12, 1);
  var end = ee.Date.fromYMD(year + 1, 5, 1);
  return loadCollection('LANDSAT/LT05/C02/T1_L2', OLD, start, end)
    .merge(loadCollection('LANDSAT/LE07/C02/T1_L2', OLD, start, end))
    .merge(loadCollection('LANDSAT/LC08/C02/T1_L2', NEW, start, end))
    .merge(loadCollection('LANDSAT/LC09/C02/T1_L2', NEW, start, end))
    .median();
}

//  MAP AND EXPORTS
Map.centerObject(region, 10);
periods.forEach(function (year) {
  var img = composite(year);
  var mvi = img.expression('(nir - green) / (swir1 - green)', {
    nir: img.select('nir'), green: img.select('green'), swir1: img.select('swir1')
  });
  var ndvi = img.normalizedDifference(['nir', 'red']);
  var mangrove = mvi.gt(mvi_threshold).and(ndvi.gt(ndvi_threshold)).clip(coastZone).selfMask();

  var picture = img.visualize(vis).blend(mangrove.visualize({palette: [mangrove_colour]}));
  Map.addLayer(picture.clip(region), {}, 'Mangrove ' + year, year === 2025);
  Export.image.toDrive({
    image: picture, description: 'intro_mangrove_' + year, folder: export_folder,
    region: region, scale: 30, crs: export_crs, maxPixels: 1e9
  });
});
Map.addLayer(ee.Image().paint(sections, 0, 2), {palette: ['yellow']}, 'Sections', false);