const csv = require('csv-parser');
const fs = require('fs');

const citiesFile = 'dist/cities.json';

function build() {
  let cities = {};
  return new Promise((resolve) => {
    fs.createReadStream('src/cities.csv')
      .pipe(csv({
        separator: ';'
      }))
      .on('data', (data) => {
        cities[data['Code_commune_INSEE']] = {
          name: data['Nom_commune'],
          coordinates: data['coordonnees_gps'].split(/,\s?/),
        };
      })
      .on('end', () => {
        fs.writeFile(citiesFile, JSON.stringify(cities), 'utf8', () => {});
        resolve(cities);
      });
  });
}

function get() {
  let wait;
  if (!fs.existsSync(citiesFile)) {
    wait = build();
  }
  else {
    wait = new Promise((resolve) => {
      fs.readFile(citiesFile, (err, data) => {
        resolve(JSON.parse(data));
      });
    });

  }
  return wait;
}

module.exports = get;
