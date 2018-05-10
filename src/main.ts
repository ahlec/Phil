'use strict';

import { ensureNecessaryEnvironmentVariables } from './phil/environment-manager';
import { GlobalConfig } from './phil/global-config';
import { Database } from './phil/database';
import { Phil } from './phil/phil';
import { WebPortal } from './phil/web-portal';

async function main() {
    try {
        ensureNecessaryEnvironmentVariables();

        const globalConfig = GlobalConfig.retrieve();
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
