'use strict';

import { ensureNecessaryEnvironmentVariables } from './phil/environment-manager';
import { Database } from './phil/database';
import { Phil } from './phil/phil';
import { WebPortal } from './phil/web-portal';

function handleStartupError(err : Error) {
    console.error(err);
    process.exit(1);
}

try {
    ensureNecessaryEnvironmentVariables();
    const db = new Database();
    db.checkIsCurrentVersion()
        .then((db: Database) => new Phil(db))
        .then((phil: Phil) => phil.start())
        .then(() => new WebPortal())
        .then((webPortal: WebPortal) => webPortal.start())
        .then((webPortal: WebPortal) => webPortal.beginKeepAliveHeartbeat())
        .catch(handleStartupError);
} catch (err) {
    handleStartupError(err);
}
