import { Pool, QueryResult } from 'pg';
import GlobalConfig from './global-config';
import Versions from './versions';

export default class Database {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({ connectionString: GlobalConfig.databaseUrl });
  }

  public async checkIsCurrentVersion() {
    const results = await this.query(
      'SELECT version FROM schemaversion ORDER BY version DESC LIMIT 1'
    );

    const {
      rows: [row],
    } = results;
    if (!row) {
      throw new Error(
        'There is no database entry for the current database version number.'
      );
    }

    const dbVersion = parseInt(row.version, 10);
    if (dbVersion !== Versions.DATABASE) {
      throw new Error(
        'The required database version is ' +
          Versions.DATABASE +
          ' but the current database is version ' +
          dbVersion
      );
    }
  }

  public query(text: string, values?: any[]): Promise<QueryResult> {
    return new Promise((resolve, reject) => {
      this.pool.connect((error, client, done) => {
        if (error) {
          reject(error);
          return;
        }

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

  public async querySingle(text: string, values?: any[]): Promise<any> {
    const {
      rows: [row],
    } = await this.query(text, values);

    if (!row) {
      return null;
    }

    return row;
  }

  public async execute(text: string, values?: any[]): Promise<number> {
    const { rowCount = 0 } = await this.query(text, values);
    return rowCount;
  }
}
