import { Pool, QueryResult } from 'pg';
import GlobalConfig from '@phil/GlobalConfig';
import Logger from '@phil/Logger';
import LoggerDefinition from '@phil/LoggerDefinition';
import { DATABASE_VERSION } from '@phil/versions';

import InfoField from './InfoField';
import DatabaseResult from './result';

export { DatabaseResult };

const EMPTY_ARRAY: unknown[] = [];

export default class Database extends Logger {
  private readonly pool: Pool;

  constructor() {
    super(new LoggerDefinition('Database'));
    this.pool = new Pool({ connectionString: GlobalConfig.databaseUrl });
  }

  public async checkIsCurrentVersion(): Promise<boolean> {
    const results = await this.querySingle<{ version: string }>(
      'SELECT version FROM schemaversion ORDER BY version DESC LIMIT 1'
    );

    if (!results) {
      this.error(
        'There is no database entry for the current database version number.'
      );
      return false;
    }

    const dbVersion = parseInt(results.version, 10);
    if (dbVersion !== DATABASE_VERSION) {
      this.error(
        `The required database version is ${DATABASE_VERSION} but the current database is version ${dbVersion}`
      );
      return false;
    }

    this.write(`Database is at current version of ${DATABASE_VERSION}.`);
    return true;
  }

  public makeInfoField(key: string): InfoField {
    return new InfoField(this, key);
  }

  public query<TRow = unknown>(
    text: string,
    values?: unknown[]
  ): Promise<DatabaseResult<TRow>> {
    return new Promise((resolve, reject) => {
      this.pool.connect((error, client, done) => {
        if (error) {
          reject(error);
          return;
        }

        client.query(
          text,
          values || EMPTY_ARRAY,
          (err: Error, result: QueryResult) => {
            done();

            if (err) {
              reject(err);
              return;
            }

            resolve(new DatabaseResult(result));
          }
        );
      });
    });
  }

  public async querySingle<TRow = unknown>(
    text: string,
    values?: unknown[]
  ): Promise<TRow | null> {
    const {
      rows: [row],
    } = await this.query<TRow>(text, values);

    if (!row) {
      return null;
    }

    return row;
  }

  public async execute(text: string, values?: unknown[]): Promise<number> {
    const { rowCount = 0 } = await this.query(text, values);
    return rowCount;
  }
}
