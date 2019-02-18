import Feature from './feature';

// Disable alphabetical sorting for this file.
// Each feature here is enumerated by a numerical key, and it's the most maintainable
// to keep the lookup ordered by the numerical key instead of alphabetically.
/* tslint:disable:object-literal-sort-keys */

export const AllFeatures = {
  Prompts: new Feature(1, 'Prompts', ['prompt', 'prompts']),
  TimezoneProcessing: new Feature(2, 'Timezone Processing', [
    'timezone',
    'timezones',
    'tz',
  ]),
  Requestables: new Feature(3, 'Requestable Roles', [
    'role',
    'roles',
    'requestable',
    'requestables',
  ]),
  Colour: new Feature(4, 'Colour Names', ['color', 'colour']),
  Calendar: new Feature(5, 'Calendar', ['calendar']),
  Pronouns: new Feature(6, 'Pronouns', ['pronoun', 'pronouns']),
  WelcomeMessage: new Feature(7, 'Welcome Message', [
    'welcome',
    'welcomemessage',
  ]),
  FandomMap: new Feature(8, 'Fandom Map', ['map']),
  TemporaryChannels: new Feature(9, 'Temporary Channels', ['tempchannels']),
};

export default AllFeatures;
