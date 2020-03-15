import countryjs from 'countryjs';
import countriesAndTimezones from 'countries-and-timezones';
import fs from 'fs';

const countryTimezones = {};
const usaData = {
  isCities: false,
  timezones: [
    // Compiled with help from http://php.net/manual/en/timezones.america.php#114172
    {
      displayName: 'Eastern Standard Time (EST)',
      name: 'America/New_York',
    },
    {
      displayName: 'Central Standard Time (CST)',
      name: 'America/Chicago',
    },
    {
      displayName: 'Mountain Standard Time (MST)',
      name: 'America/Denver',
    },
    {
      displayName: 'Pacific Standard Time (PST)',
      name: 'America/Los_Angeles',
    },
    {
      displayName: 'Pacific Standard Time (PST)',
      name: 'America/Anchorage',
    },
    {
      displayName: 'Hawaii Standard Time (HST)',
      name: 'America/Adak',
    },
  ],
};

function formatTimezoneDisplayNamePiece(piece) {
  return piece.replace('_', ' ');
}

function getTimezoneDisplayName(timezoneName) {
  // America/Indiana/Tell_City or Asia/Ho_Chi_Minh
  const pieces = timezoneName.split('/');

  let displayName = formatTimezoneDisplayNamePiece(pieces[pieces.length - 1]);
  if (pieces.length > 2) {
    displayName += ' (' + formatTimezoneDisplayNamePiece(pieces[1]) + ')';
  }

  return displayName;
}

function mapTimezoneData(timezoneData) {
  return {
    displayName: getTimezoneDisplayName(timezoneData.name),
    name: timezoneData.name,
  };
}

function getPhilTimezoneData(isoAlpha2) {
  if (isoAlpha2 === 'US') {
    return usaData;
  }

  const timezonesData = countriesAndTimezones.getTimezonesForCountry(isoAlpha2);
  return {
    isCities: true,
    timezones: timezonesData.map(mapTimezoneData),
  };
}

const allCountries = countryjs.all();
for (const countryData of allCountries) {
  const isoAlpha2 = countryData.ISO.alpha2;
  if (!isoAlpha2) {
    continue;
  }

  const timezonesData = getPhilTimezoneData(isoAlpha2);
  if (!timezonesData || timezonesData.timezones.length === 0) {
    console.log('skipping (iso2: ' + isoAlpha2 + ') because no timezone data.');
    continue;
  }

  if (countryData.name) {
    countryTimezones[countryData.name.toLowerCase()] = timezonesData;
  }

  if (countryData.nativeName) {
    countryTimezones[countryData.nativeName.toLowerCase()] = timezonesData;
  }

  if (countryData.altSpellings) {
    for (const altName of countryData.altSpellings) {
      countryTimezones[altName.toLowerCase()] = timezonesData;
    }
  }
}

const jsonContent = JSON.stringify(countryTimezones, null, 4);
fs.writeFile('../data/country-timezones.json', jsonContent, 'utf8', function(
  err
) {
  if (err) {
    return console.error(err);
  }

  console.log('JSON file written.');
});
