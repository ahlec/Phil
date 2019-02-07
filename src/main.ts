import Database from './database';
import { ensureNecessaryEnvironmentVariables } from './environment-manager';
import Phil from './phil';
import WebPortal from './WebPortal';

async function main() {
  try {
    ensureNecessaryEnvironmentVariables();

    const db = new Database();
    if (!(await db.checkIsCurrentVersion())) {
      return;
    }

    const phil = new Phil(db);
    phil.start();

    const webPortal = new WebPortal();
    webPortal.start();
    webPortal.beginKeepAliveHeartbeat();
  } catch (err) {
    console.error(err); /* tslint:disable-line */
    process.exit(1);
  }
}

main();
