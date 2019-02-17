import * as fs from 'fs';
import * as path from 'path';
import * as semver from 'semver';

const PACKAGE_JSON = path.resolve(__dirname, '../package.json');
const packageJson: any = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));

export const CODE_VERSION = semver.parse(packageJson.version)!;
export const DATABASE_VERSION = parseInt(packageJson.database_version, 10);
