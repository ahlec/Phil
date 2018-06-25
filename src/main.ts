import Database from './database';
import { ensureNecessaryEnvironmentVariables } from './environment-manager';
import GlobalConfig from './global-config';
import Phil from './phil';
import WebPortal from './web-portal';

async function main() {
    try {
        ensureNecessaryEnvironmentVariables();

        const globalConfig = new GlobalConfig();
        const db = new Database(globalConfig);
        await db.checkIsCurrentVersion();

        const phil = new Phil(db, globalConfig);
        phil.start();

        const webPortal = new WebPortal(globalConfig);
        webPortal.start();
        webPortal.beginKeepAliveHeartbeat();
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

main();
