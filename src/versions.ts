import * as semver from 'semver';
import * as packageJson from '../package.json';

const parsedSemVer = semver.parse(packageJson.version);
if (!parsedSemVer) {
  throw new Error('Could not parse package.version as SemVer');
}

export const CODE_VERSION = parsedSemVer;
export const DATABASE_VERSION = parseInt(packageJson.database_version, 10);
