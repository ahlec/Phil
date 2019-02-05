const countryTimezonesJson = require('../../../data/country-timezones.json');

interface Timezone {
  readonly name: string;
  readonly displayName: string;
}

export interface TimezoneData {
  readonly isCities: boolean;
  readonly timezones: ReadonlyArray<Timezone>;
}

export const CountryTimezones: {
  [name: string]: TimezoneData;
} = countryTimezonesJson;
