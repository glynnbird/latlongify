const fs = require('fs')
const path = require('path')
const countries = []
const counties = []
const states = []

// pre-load geo-json
const loadCollection = async (arr, folder) => {
  try {
    const dir = fs.opendirSync(folder)
    for await (const dirent of dir) {
      const p = path.join(folder, dirent.name)
      const c = await fs.readFileSync(p, {encoding: 'utf8'})
      arr.push(JSON.parse(c))
    }
  } catch (err) {
    console.error(err);
  }
}

const inside = function (point, vs) {
  // ray-casting algorithm based on
  // https://wrf.ecse.rpi.edu/Research/Short_Notes/pnpoly.html/pnpoly.html
  
  var x = point[0], y = point[1];
  
  var inside = false;
  for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
      var xi = vs[i][0], yi = vs[i][1];
      var xj = vs[j][0], yj = vs[j][1];
      
      var intersect = ((yi > y) != (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
  }
  
  return inside;
};

// loop through a collection of GeoJson features, finding first one where lat/long is inside
const findInCollection = async (collection, latitude, longitude) => {
  for(let country of collection) {
    if (typeof country.geometry.type === 'string' && country.geometry.type === 'MultiPolygon') {
      for(let island of country.geometry.coordinates) {
        if (island.length === 1) {
          island = island[0]
        }
        if (inside([longitude, latitude], island)) {
          return country.properties
        }
      }
    }  else {
      // assume a polygon
      if (country.geometry.coordinates.length === 1) {
        country.geometry.coordinates = country.geometry.coordinates[0]
      }
      if (inside([longitude, latitude], country.geometry.coordinates)) {
        return country.properties
      }
    } 
  }
  return null
}

// find the country/country/state matching the supplied lat/long
const find = async (latitude, longitude) => {
  if (countries.length === 0) {
    await loadCollection(countries, './countries')
    await loadCollection(counties, './counties')
    await loadCollection(states, './states')
  }
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Missing parameter: latitude, longitude')
  }
  let countryMatch, stateMatch, countyMatch
  countryMatch = await findInCollection(countries, latitude, longitude)
  if (countryMatch && countryMatch.code === 'GBR') {
    countyMatch = await findInCollection(counties, latitude, longitude)
  } else if (countryMatch && countryMatch.code === 'USA') {
    stateMatch = await findInCollection(states, latitude, longitude)
  }
  return { country: countryMatch, state: stateMatch, county: countyMatch }
}

module.exports = {
  find
}