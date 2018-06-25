import GlobalConfig from 'global-config';
import { Pool, QueryResult } from 'pg';
import Versions from 'versions';

export default class Database {
    private readonly pool: Pool;

    constructor(globalConfig : GlobalConfig) {
        this.pool = new Pool({ connectionString: globalConfig.databaseUrl });
    }

    public async checkIsCurrentVersion() {
        const results = await this.query('SELECT value FROM info WHERE key = \'database-version\'');

        if (results.rowCount === 0) {
            throw new Error('There is no database entry for the current database version number.');
        }

        const dbVersion = parseInt(results.rows[0].value, 10);
        if (dbVersion !== Versions.DATABASE) {
            throw new Error('The required database version is ' + Versions.DATABASE + ' but the current database is version ' + dbVersion);
        }
    }

    public query(text: string, values?: any[]) : Promise<QueryResult> {
        return new Promise((resolve, reject) => {
            this.pool.connect((error, client, done) => {
                client.query(text, values, (err, result) => {
                    done();

                    if (err) {
                        reject(err);
                        return;
                    }

                    resolve(result);
                });
            });
        });
    }
};
