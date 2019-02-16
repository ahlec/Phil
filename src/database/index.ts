import { Pool, QueryResult } from 'pg';
import GlobalConfig from '../global-config';
import Logger from '../Logger';
import LoggerDefinition from '../LoggerDefinition';
import Versions from '../versions';
import DatabaseResult from './result';

export { default as DatabaseResult } from './result';

const EMPTY_ARRAY: any[] = [];

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
    if (dbVersion !== Versions.DATABASE) {
      this.error(
        `The required database version is ${
          Versions.DATABASE
        } but the current database is version ${dbVersion}`
      );
      return false;
    }

    this.write(`Database is at current version of ${Versions.DATABASE}.`);
    return true;
  }

  public query<TRow = any>(
    text: string,
    values?: any[]
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

  public async querySingle<TRow = any>(
    text: string,
    values?: any[]
  ): Promise<TRow | null> {
    const {
      rows: [row],
    } = await this.query<TRow>(text, values);

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
