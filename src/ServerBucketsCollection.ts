import Client from '@phil/discord/Client';
import Server from '@phil/discord/Server';

import Bucket, { BucketFrequency } from './buckets';
import Database from './database';
import ServerSubmissionsCollection from './ServerSubmissionsCollection';
import ServerConfig from './server-config';

type BucketRetrieval =
  | {
      type: 'id';
      id: number;
    }
  | {
      type: 'reference-handle';
      handle: string;
    }
  | {
      type: 'channel';
      channelId: string;
    };

interface BatchBucketRetrieval {
  type: 'id';
  ids: ReadonlySet<number>;
}

export interface DbRow {
  bucket_id: string;
  server_id: string;
  channel_id: string;
  reference_handle: string;
  display_name: string;
  is_paused: string;
  required_role_id: string;
  alert_when_low: string;
  prompt_title_format: string;
  alerted_bucket_emptying: string;
  frequency: string;
}

const FREQUENCY_FROM_STRINGS: {
  [name: string]: BucketFrequency | undefined;
} = {
  daily: BucketFrequency.Daily,
  immediately: BucketFrequency.Immediately,
  weekly: BucketFrequency.Weekly,
};

class ServerBucketsCollection {
  public constructor(
    private readonly discordClient: Client,
    private readonly database: Database,
    private readonly server: Server,
    private readonly serverConfig: ServerConfig
  ) {}

  public async getAll(): Promise<readonly Bucket[]> {
    const results = await this.database.query<DbRow>(
      'SELECT * FROM prompt_buckets WHERE server_id = $1',
      [this.server.id]
    );
    return Promise.all(
      results.rows.map((row): Promise<Bucket> => this.parseBucket(row))
    );
  }

  public async retrieve(retrieval: BucketRetrieval): Promise<Bucket | null> {
    let query: Promise<DbRow | null>;
    switch (retrieval.type) {
      case 'id': {
        query = this.database.querySingle<DbRow>(
          'SELECT * FROM prompt_buckets WHERE bucket_id = $1',
          [retrieval.id]
        );
        break;
      }
      case 'reference-handle': {
        query = this.database.querySingle<DbRow>(
          'SELECT * FROM prompt_buckets WHERE server_id = $1 AND reference_handle = $2',
          [this.server.id, retrieval.handle]
        );
        break;
      }
      case 'channel': {
        query = this.database.querySingle<DbRow>(
          'SELECT * FROM prompt_buckets WHERE channel_id = $1',
          [retrieval.channelId]
        );
        break;
      }
    }

    const dbRow = await query;
    if (!dbRow || dbRow.server_id !== this.server.id) {
      return null;
    }

    return this.parseBucket(dbRow);
  }

  public async batchRetrieve(
    retrieval: BatchBucketRetrieval
  ): Promise<Record<number, Bucket | null>> {
    if (!retrieval.ids.size) {
      return {};
    }

    const dbResult = await this.database.query<DbRow>(
      `SELECT
        *
      FROM
        prompt_buckets
      WHERE
        bucket_id = ANY($1::int[])`,
      [Array.from(retrieval.ids)]
    );

    const result: Record<number, Bucket | null> = {};
    await Promise.all(
      dbResult.rows.map(
        async (row): Promise<void> => {
          const bucketId = parseInt(row.bucket_id, 10);
          if (row.server_id !== this.server.id) {
            result[bucketId] = null;
            return;
          }

          result[bucketId] = await this.parseBucket(row);
        }
      )
    );

    return result;
  }

  private async parseBucket(dbRow: DbRow): Promise<Bucket> {
    const channel = this.server.getTextChannel(dbRow.channel_id);
    const isValid = await this.determineIsBucketValid(dbRow);

    return new Bucket(
      this.database,
      new ServerSubmissionsCollection(
        this.database,
        this,
        this.server,
        this.serverConfig
      ),
      this.serverConfig,
      parseInt(dbRow.bucket_id, 10),
      this.server,
      channel,
      {
        alertWhenLow: parseInt(dbRow.alert_when_low, 10) === 1,
        alertedBucketEmptying:
          parseInt(dbRow.alerted_bucket_emptying, 10) === 1,
        displayName: dbRow.display_name,
        frequency:
          FREQUENCY_FROM_STRINGS[dbRow.frequency] || BucketFrequency.Daily,
        handle: dbRow.reference_handle,
        isPaused: parseInt(dbRow.is_paused, 10) === 1,
        isValid,
        promptTitleFormat: dbRow.prompt_title_format,
        requiredRoleId: dbRow.required_role_id,
      }
    );
  }

  private async determineIsBucketValid(dbRow: DbRow): Promise<boolean> {
    const server = await this.discordClient.getServer(dbRow.server_id);
    if (!server) {
      return false;
    }

    const channel = server.getTextChannel(dbRow.channel_id);
    if (!channel) {
      return false;
    }

    if (dbRow.required_role_id) {
      const requiredRole = server.getRole(dbRow.required_role_id);
      if (!requiredRole) {
        return false;
      }
    }

    return true;
  }
}

export default ServerBucketsCollection;
