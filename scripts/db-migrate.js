require('dotenv').config();
import Postgrator from 'postgrator';
import chalk from 'chalk';
import path from 'path';

const postgrator = new Postgrator({
  connectionString: process.env.DATABASE_URL,
  driver: 'pg',
  migrationPattern: `${path.resolve(__dirname, '../database')}/!(_)*.sql`,
});

async function determineTargetVersion() {
  if (process.argv.length < 3 || process.argv[2].toLowerCase() === 'max') {
    return 'max';
  }

  const versionNum = parseInt(process.argv[2], 10);
  if (Number.isNaN(versionNum)) {
    throw new Error(`Invalid target version of ${process.argv[2]}.`);
  }

  if (versionNum < 0) {
    throw new Error('Cannot request a version number less than 0.');
  }

  const maxVersion = await postgrator.getMaxVersion();
  if (versionNum > maxVersion) {
    throw new Error(
      `Cannot request a version number greater than max (${maxVersion}).`
    );
  }

  return versionNum.toString().padStart(3, '0');
}

async function doMigration(targetVersion) {
  console.log(chalk.magenta('Migrating to version:'), targetVersion);
  const migrations = await postgrator.migrate(targetVersion);
  migrations.forEach(migration => console.log(migration));
}

async function main() {
  try {
    const targetVersion = await determineTargetVersion();
    await doMigration(targetVersion);
  } catch (err) {
    console.log(chalk.red('[ERROR]'), err.message);
    process.exit(2);
  }
}

main();
