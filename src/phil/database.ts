'use strict';

const pg = require('pg');
const versions = require('./versions');

function _interpretDbCurrentVersion(results) {
    if (results.rowCount === 0) {
        return Promise.reject('There is no database entry for the current database version number.');
    }

    if (results.rows[0].value != versions.DATABASE) {
        return Promise.reject('The required database version is ' + versions.DATABASE + ' but the current database is version ' + results.rows[0].value);
    }
}

function _handleDbCurrentVersionError(err) {
    return Promise.reject('Encountered a database error when attempting to figure out the current database version. ' + err);
}

export class Database {
    private _pool: any;

    constructor() {
        this._pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    }

    checkIsCurrentVersion() {
        return this.query("SELECT value FROM info WHERE key = 'database-version'")
            .catch(_handleDbCurrentVersionError)
            .then(_interpretDbCurrentVersion)
            .then(() => this);
    }

    query(text: string, values?: any[]) {
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
