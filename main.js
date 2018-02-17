'use strict';

const EnvironmentManager = require('./phil/environment-manager');
const Database = require('./phil/database');
const Phil = require('./phil/phil');
const WebPortal = require('./phil/web-portal');

function handleStartupError(err) {
    console.error(err);
    process.exit(1);
}

EnvironmentManager.assertVariablesValid()
    .then(() => new Database())
    .then(db => db.checkIsCurrentVersion())
    .then(db => new Phil(db))
    .then(phil => phil.start())
    .then(() => new WebPortal())
    .then(webPortal => webPortal.start())
    .then(webPortal => webPortal.beginKeepAliveHeartbeat())
    .catch(handleStartupError);
