'use strict';

const pg = require('pg');
const versions = require('./versions');

function _interpretDbCurrentVersion(results) {
    if (results.rowCount === 0) {
        throw 'There is no databse entry for the current database version number.';
    }

    if (results.rows[0].value != versions.DATABASE) {
        throw 'The required database version is ' + versions.DATABASE + ' but the current database is version ' + result.rows[0].value;
    }
}

function _handleDbCurrentVersionError(err) {
    throw 'Encountered a database error when attempting to figure out the current database version. ' + err;
}

function _determineCurrentVersion(db) {
    return db.query("SELECT value FROM info WHERE key = 'database-version'")
        .catch(_handleDbCurrentVersionError)
        .then(_interpretDbCurrentVersion)
        .then(() => db);
}

module.exports = class Database {
    constructor() {
        this._pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    }

    checkIsCurrentVersion() {
        return _determineCurrentVersion(this);
    }

    query(text, values) {
        return new Promise((resolve, reject) => {
            this._pool.connect(function(error, client, done) {
                client.query(text, values, function(err, result) {
                    done();
                    if (err) {
                        reject(err);
                    } else {
                        resolve(result);
                    }
                });
            });
        });
    }
};