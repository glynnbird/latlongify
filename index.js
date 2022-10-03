const path = require('path')
let ref = null

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

const findNearest = (things, latitude, longitude) => {
  let nearestThing = null
  let nearestDistance = 100000000
  for (thing of things) {
    // bit of pythagoras
    const dx = thing.lat - latitude
    const dy = thing.long - longitude
    const d = Math.sqrt(dx*dx + dy*dy)
    if (d < nearestDistance) {
      nearestDistance = d
      nearestThing = thing
    }
  }
  return nearestThing
}

// find the country/country/state matching the supplied lat/long
const find = async (latitude, longitude) => {
  if (!ref) {
    ref = require('./ref.json')
  }
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Missing parameter: latitude, longitude')
  }
  let countryMatch, stateMatch, countyMatch, cityMatch
  countryMatch = await findInCollection(ref.countries, latitude, longitude)
  if (countryMatch && countryMatch.code === 'GBR') {
    countyMatch = await findInCollection(ref.counties, latitude, longitude)
    cityMatch = findNearest(ref.cities, latitude, longitude)
  } else if (countryMatch && countryMatch.code === 'USA') {
    stateMatch = await findInCollection(ref.states, latitude, longitude)
  }
  return { country: countryMatch, state: stateMatch, county: countyMatch, city: cityMatch }
}

module.exports = {
  find
}