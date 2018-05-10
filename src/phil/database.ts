'use strict';

import { Pool, QueryResult } from 'pg';
import { Versions } from './versions';
import { GlobalConfig } from './global-config';

export class Database {
    private readonly _pool : Pool;

    constructor(globalConfig : GlobalConfig) {
        this._pool = new Pool({ connectionString: globalConfig.databaseUrl });
    }

    async checkIsCurrentVersion() {
        const results = await this.query('SELECT value FROM info WHERE key = \'database-version\'');

        if (results.rowCount === 0) {
            throw new Error('There is no database entry for the current database version number.');
        }

        const dbVersion = parseInt(results.rows[0].value);
        if (dbVersion != Versions.DATABASE) {
            throw new Error('The required database version is ' + Versions.DATABASE + ' but the current database is version ' + dbVersion);
        }
    }

    query(text: string, values?: any[]) : Promise<QueryResult> {
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
