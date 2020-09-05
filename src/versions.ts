import * as packageJson from '../package.json';

/**
 * Regular expression to parse a consistent and well-formed semver, as will
 * be found in package.json
 */
const SEMVER_REGEX = /^(\d+)\.(\d+)\.(\d+)$/;

const parsedCodeVersion = SEMVER_REGEX.exec(packageJson.version);
if (!parsedCodeVersion) {
  throw new Error('Could not parse package.version as SemVer');
}

export const CODE_VERSION: Readonly<{
  displayString: string;
  majorVersion: number;
}> = {
  displayString: parsedCodeVersion[0],
  majorVersion: parseInt(parsedCodeVersion[1]),
};
export const DATABASE_VERSION = parseInt(packageJson.database_version, 10);
