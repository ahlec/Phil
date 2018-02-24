'use strict';

import { ensureNecessaryEnvironmentVariables } from './phil/environment-manager';
import { Database } from './phil/database';
import { Phil } from './phil/phil';
import { WebPortal } from './phil/web-portal';

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
