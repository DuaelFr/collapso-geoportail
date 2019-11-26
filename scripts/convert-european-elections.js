const csv = require('csv-parser');
const fs = require('fs');
const kml = require('gtran-kml');
const cities = require('./utils/build-cities-json');

function buildHeaders(nbCandidates, additionalHeaders) {
  const hasCirconscription = arguments[2] || false;
  const headersCommonsStart = [
    'Code du département',
    'Libellé du département',
  ];
  const headersCommonsCirconscription = (hasCirconscription ? [
    'Code de la circonscription',
    'Libellé de la circonscription',
  ] : []);
  const headersCommonsEnd = [
    'Code de la commune',
    'Libellé de la commune',
    'Inscrits',
    'Abstentions',
    '% Abs/Ins',
    'Votants',
    '% Vot/Ins',
    'Blancs',
    '% Blancs/Ins',
    '% Blancs/Vot',
    'Nuls',
    '% Nuls/Ins',
    '% Nuls/Vot',
    'Exprimés',
    '% Exp/Ins',
    '% Exp/Vot',
  ];
  let headers = [...headersCommonsStart, ...headersCommonsCirconscription, ...headersCommonsEnd];

  for (let i = 1 ; i < (nbCandidates + 1) ; i++) {
    for (let j = 0, n = additionalHeaders.length; j < n; j++) {
      headers.push(additionalHeaders[j] + ' ' + i);
    }
  }
  return headers;
}

function buildInseeCode(codeDpt, codeCity) {
  const dom = ['ZA', 'ZB', 'ZC', 'ZD'];
  if (dom.indexOf(codeDpt.toUpperCase()) > -1) {
    codeDpt = "97";
  }
  return codeDpt.padStart(2, '0') + codeCity.padStart(3, '0');
}

function compareVoices(objectA, objectB) {
  if (objectA.voices > objectB.voices) {
    return -1;
  }
  else if (objectA.voices < objectB.voices) {
    return 1;
  }
  return 0;
}

function parseFrenchFloat(value) {
  return parseFloat(value.replace(',', '.'));
}

// https://fr.wikipedia.org/wiki/Liste_des_listes_fran%C3%A7aises_aux_%C3%A9lections_europ%C3%A9ennes_de_2019
const partyMapping = {
  "LA FRANCE INSOUMISE": 'EXG',
  "UNE FRANCE ROYALE": 'DVD',
  "LA LIGNE CLAIRE": 'EXD',
  "PARTI PIRATE": 'EXG',
  "RENAISSANCE": 'DVD',
  "DÉMOCRATIE REPRÉSENTATIVE": 'EXG',
  "ENSEMBLE PATRIOTES": 'EXD',
  "PACE": 'DVG',
  "URGENCE ÉCOLOGIE": 'ECO',
  "LISTE DE LA RECONQUÊTE": 'EXD',
  "LES EUROPÉENS": 'DVD',
  "ENVIE D'EUROPE": 'DVG',
  "PARTI FED. EUROPÉEN": 'DVD',
  "INITIATIVE CITOYENNE": 'CTR',
  "DEBOUT LA FRANCE": 'EXD',
  "ALLONS ENFANTS": 'CTR',
  "DÉCROISSANCE 2019": 'ECO',
  "LUTTE OUVRIÈRE": 'EXG',
  "POUR L'EUROPE DES GENS": 'EXG',
  "ENSEMBLE POUR LE FREXIT": 'DVD',
  "LISTE CITOYENNE": 'DVG',
  "À VOIX ÉGALES": 'DVG',
  "PRENEZ LE POUVOIR": 'EXD',
  "NEUTRE ET ACTIF": 'CTR',
  "RÉVOLUTIONNAIRE": 'EXG',
  "ESPERANTO": 'DVG',
  "ÉVOLUTION CITOYENNE": 'DVG',
  "ALLIANCE JAUNE": 'DVG',
  "UNION DROITE-CENTRE": 'DVD',
  "EUROPE ÉCOLOGIE": 'ECO',
  "PARTI ANIMALISTE": 'ECO',
  "LES OUBLIES DE L'EUROPE": 'DVD',
  "UDLEF": 'DVD',
  "EUROPE AU SERVICE PEUPLES": 'DVG',
};

function defineSymbol(feature) {
  const settings = {
    'ECO': {
      icon: 'https://github.com/DuaelFr/collapso-geoportail/blob/master/src/images/flag-green.png',
      scale: 1,
    },
    'EXG': {
      icon: 'https://github.com/DuaelFr/collapso-geoportail/blob/master/src/images/flag-red.png',
      scale: 1,
    },
    'DVG': {
      icon: 'https://github.com/DuaelFr/collapso-geoportail/blob/master/src/images/flag-pink.png',
      scale: 1,
    },
    'CTR': {
      icon: 'https://github.com/DuaelFr/collapso-geoportail/blob/master/src/images/flag-orange.png',
      scale: 1,
    },
    'DVD': {
      icon: 'https://github.com/DuaelFr/collapso-geoportail/blob/master/src/images/flag-blue.png',
      scale: 1,
    },
    'EXD': {
      icon: 'https://github.com/DuaelFr/collapso-geoportail/blob/master/src/images/flag-brown.png',
      scale: 1,
    },
  };
  return settings[feature.meta.shade];
}

function convert() {
  cities().then((cities) => {
    const nbCandidates = 34;
    const headers = buildHeaders(nbCandidates, [
      'N°Liste',
      'Libellé Abrégé Liste',
      'Libellé Etendu Liste',
      'Nom Tête de Liste',
      'Voix Liste',
      '% Voix/Ins Liste',
      '% Voix/Exp Liste',
    ]);

    let citiesByResult = {};
    fs.createReadStream('src/elections-europeennes-2019.csv')
      .pipe(csv({
        skipLines: 1,
        headers: headers,
      }))
      .on('data', (data) => {
        const insee = buildInseeCode(data['Code du département'], data['Code de la commune']);
        if (!cities[insee]) {
          return;
        }

        let percentPerShade = {};
        for (let i = 1 ; i < (nbCandidates + 1) ; i++) {
          if (data['Nom Tête de Liste ' + i].length === 0) {
            continue;
          }
          let shade = partyMapping[data['Libellé Abrégé Liste ' + i]];
          if (!percentPerShade[shade]) {
            percentPerShade[shade] = 0;
          }
          percentPerShade[shade] += parseFrenchFloat(data['% Voix/Exp Liste ' + i]);
        }

        let shadesDetail = [];
        const sortedShades = Object.keys(percentPerShade).sort(function(a,b){return percentPerShade[b]-percentPerShade[a]});
        sortedShades.forEach((shade) => {
          const percent = Math.round(percentPerShade[shade] * 100) / 100;
          shadesDetail.push(`<strong>${shade}</strong> : ${percent}%`);
        });

        const firstShade = sortedShades[0];
        const department = insee.substr(0, 2);
        if (!citiesByResult[firstShade]) {
          citiesByResult[firstShade] = {};
        }
        if (!citiesByResult[firstShade][department]) {
          citiesByResult[firstShade][department] = [];
        }
        citiesByResult[firstShade][department].push({
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [cities[insee].coordinates[1], cities[insee].coordinates[0]],
          },
          meta: {
            shade: firstShade,
          },
          properties: {
            name: cities[insee].name,
            description: "<h3>Élections européennes 2019</h3><p>" + shadesDetail.join("</p><p>") + "</p>",
          }
        });
      })
      .on('end', () => {
        Object.keys(citiesByResult).forEach((shade) => {
          let allCountry = [];
          Object.keys(citiesByResult[shade]).forEach((department) => {
            allCountry = [...citiesByResult[shade][department], ...allCountry];
            let geoJson = {
              type: "FeatureCollection",
              features: citiesByResult[shade][department],
            };

            kml.fromGeoJson(geoJson, `dist/politics/european_2019/per_department/${department}_${shade}.kml`, {
              symbol: defineSymbol,
              name: 'name',
              documentName: `Villes du ${department} à tendance ${shade}`,
              documentDescription: `Villes du ${department} ayant principalement voté ${shade} aux européennes de 2019`,
            });
          });

          let geoJson = {
            type: "FeatureCollection",
            features: allCountry,
          };

          kml.fromGeoJson(geoJson, `dist/politics/european_2019/${shade}.kml`, {
            symbol: defineSymbol,
            name: 'name',
            documentName: `Villes à tendance ${shade}`,
            documentDescription: `Villes ayant principalement voté ${shade} aux européennes de 2019`,
          });
        });
      })
  });

}

module.exports = convert;