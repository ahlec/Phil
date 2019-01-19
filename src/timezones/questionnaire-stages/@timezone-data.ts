const countryTimezonesJson = require('../../../data/country-timezones.json');

interface ITimezone {
  readonly name: string;
  readonly displayName: string;
}

export interface ITimezoneData {
  readonly isCities: boolean;
  readonly timezones: ReadonlyArray<ITimezone>;
}

export const CountryTimezones: {
  [name: string]: ITimezoneData;
} = countryTimezonesJson;
