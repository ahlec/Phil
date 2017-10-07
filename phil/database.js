'use strict';

const pg = require('pg');
const versions = require('./versions');

function _interpretDbCurrentVersion(resolve, reject, results) {
    if (results.rowCount === 0) {
        reject('There is no databse entry for the current database version number.');
        return;
    }

    if (results.rows[0].value != versions.DATABASE) {
        reject('The required database version is ' + versions.DATABASE + ' but the current database is version ' + result.rows[0].value);
        return;
    }

    resolve();
}

function _handleDbCurrentVersionError(reject, err) {
    reject('Encountered a database error when attempting to figure out the current database version. ' + err);
}

function _determineCurrentVersion(db, resolve, reject) {
    db.query("SELECT value FROM info WHERE key = 'database-version'")
        .then(results => _interpretDbCurrentVersion(resolve, reject, results))
        .then(() => resolve(db))
        .catch(err => _handleDbCurrentVersionError(reject, err));
}

module.exports = class Database {
    constructor() {
        this._pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    }

    checkIsCurrentVersion() {
        return new Promise((resolve, reject) => _determineCurrentVersion(this, resolve, reject));
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