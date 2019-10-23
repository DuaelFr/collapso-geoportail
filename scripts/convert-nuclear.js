const csv = require('csv-parser');
const fs = require('fs');
const circleToPolygon = require('circle-to-polygon');
const kml = require('gtran-kml');

function convert() {
  let area_80 = [];
  let area_20 = [];
  let power_plant = [];
  fs.createReadStream('src/nuclear_power_plants.csv')
    .pipe(csv())
    .on('data', (data) => {
      const center = [data['Centrale Long'], data['Centrale Lat']];
      area_80.push({
        type: "Feature",
        geometry: circleToPolygon(center, 80000, 64),
        properties: {
          type: 'area_80',
        }
      });
      area_20.push({
        type: "Feature",
        geometry: circleToPolygon(center, 20000, 32),
        properties: {
          type: 'area_20',
        }
      });
      power_plant.push({
        type: "Feature",
        geometry: {
          type: "Point",
          coordinates: center,
        },
        properties: {
          type: 'power_plant',
          name: data['Centrale nucléaire'],
        }
      });
    })
    .on('end', () => {
      let geoJson = {
        type: "FeatureCollection",
        features: [...area_80, ...area_20, ...power_plant],
      };
      kml.fromGeoJson(geoJson, 'dist/nuclear_power_plants.kml', {
        symbol: (feature) => {
          const settings = {
            'area_80': {
              color: '#ff7700',
              alpha: 255,
              fill: true,
              outline: false,
            },
            'area_20': {
              color: '#ff0000',
              alpha: 255,
              fill: true,
              outline: false,
            },
            'power_plant': {
              icon: 'https://nukemap.greenpeace.fr/wp-content/themes/nuke/assets/marker-nuke.png',
              scale: 1,
            }
          };
          return settings[feature.properties.type];
        },
        name: 'name',
        documentName: 'Centrales Nucléaires',
        documentDescription: 'Liste des centres nucléaires françaises avec leur zones PPI'
      });
    });
}

module.exports = convert;