import Database from './database';
import { ensureNecessaryEnvironmentVariables } from './environment-manager';
import Phil from './phil';
import WebPortal from './web-portal';

async function main() {
  try {
    ensureNecessaryEnvironmentVariables();

    const db = new Database();
    await db.checkIsCurrentVersion();

    const phil = new Phil(db);
    phil.start();

    const webPortal = new WebPortal();
    webPortal.start();
    webPortal.beginKeepAliveHeartbeat();
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

main();
