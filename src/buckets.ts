import {
  Client as DiscordIOClient,
  Server as DiscordIOServer,
} from 'discord.io';
import * as moment from 'moment';
import Database from './database';
import { getMemberRolesInServer } from './promises/discord';

export enum BucketFrequency {
  Daily = 0,
  Weekly = 1,
  Immediately = 2,
}

const frequencyDisplayStrings = {
  [BucketFrequency.Daily]: 'Daily',
  [BucketFrequency.Weekly]: 'Weekly',
  [BucketFrequency.Immediately]: 'Immediately',
};

const frequencyFromStrings: { [name: string]: BucketFrequency | undefined } = {
  daily: BucketFrequency.Daily,
  immediately: BucketFrequency.Immediately,
  weekly: BucketFrequency.Weekly,
};

interface DbRow {
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

export default class Bucket {
  public static async getFromId(
    bot: DiscordIOClient,
    db: Database,
    bucketId: number
  ): Promise<Bucket | null> {
    const results = await db.query<DbRow>(
      'SELECT * FROM prompt_buckets WHERE bucket_id = $1',
      [bucketId]
    );
    if (results.rowCount !== 1) {
      return null;
    }

    return new Bucket(bot, results.rows[0]);
  }

  public static async getFromBatchIds(
    bot: DiscordIOClient,
    db: Database,
    ids: ReadonlySet<number>
  ): Promise<{ [id: number]: Bucket | undefined }> {
    const returnValue: { [id: number]: Bucket | undefined } = {};
    if (!ids.size) {
      return returnValue;
    }

    const result = await db.query<DbRow>(
      `SELECT
        *
      FROM
        prompt_buckets
      WHERE
        bucket_id = ANY($1::int[])`,
      [[...ids]]
    );

    result.rows.forEach((row) => {
      const bucket = new Bucket(bot, row);
      returnValue[bucket.id] = bucket;
    });

    return returnValue;
  }

  public static async getFromChannelId(
    bot: DiscordIOClient,
    db: Database,
    channelId: string
  ): Promise<Bucket | null> {
    const results = await db.query<DbRow>(
      'SELECT * FROM prompt_buckets WHERE channel_id = $1',
      [channelId]
    );
    if (results.rowCount !== 1) {
      return null;
    }

    return new Bucket(bot, results.rows[0]);
  }

  public static async getFromReferenceHandle(
    bot: DiscordIOClient,
    db: Database,
    server: DiscordIOServer,
    referenceHandle: string
  ): Promise<Bucket | null> {
    const results = await db.query<DbRow>(
      'SELECT * FROM prompt_buckets WHERE server_id = $1 AND reference_handle = $2',
      [server.id, referenceHandle]
    );
    if (results.rowCount !== 1) {
      return null;
    }

    return new Bucket(bot, results.rows[0]);
  }

  public static async getAllForServer(
    bot: DiscordIOClient,
    db: Database,
    serverId: string
  ): Promise<Bucket[]> {
    const results = await db.query<DbRow>(
      'SELECT * FROM prompt_buckets WHERE server_id = $1',
      [serverId]
    );
    return results.rows.map((row) => new Bucket(bot, row));
  }

  private static determineIsBucketValid(
    bot: DiscordIOClient,
    dbRow: DbRow
  ): boolean {
    const server = bot.servers[dbRow.server_id];
    if (!server) {
      return false;
    }

    if (!(dbRow.channel_id in server.channels)) {
      return false;
    }

    if (dbRow.required_role_id) {
      if (!(dbRow.required_role_id in server.roles)) {
        return false;
      }
    }

    return true;
  }

  public readonly id: number;
  public readonly serverId: string;
  public readonly channelId: string;
  public readonly isValid: boolean;
  public readonly handle: string;
  public readonly displayName: string;
  public readonly isPaused: boolean;
  public readonly requiredRoleId?: string;
  public readonly alertWhenLow: boolean;
  public readonly frequency: BucketFrequency;
  public readonly frequencyDisplayName: string;
  public readonly promptTitleFormat: string;
  public internalAlertedBucketEmptying: boolean;

  private constructor(bot: DiscordIOClient, dbRow: DbRow) {
    const isValid = Bucket.determineIsBucketValid(bot, dbRow);
    let bucketFrequency = frequencyFromStrings[dbRow.frequency];
    if (bucketFrequency === undefined) {
      bucketFrequency = BucketFrequency.Daily;
    }

    this.id = parseInt(dbRow.bucket_id, 10);
    this.serverId = dbRow.server_id;
    this.channelId = dbRow.channel_id;
    this.isValid = isValid;
    this.handle = dbRow.reference_handle;
    this.displayName = dbRow.display_name;
    this.isPaused = parseInt(dbRow.is_paused, 10) === 1;
    this.requiredRoleId = dbRow.required_role_id;
    this.alertWhenLow = parseInt(dbRow.alert_when_low, 10) === 1;
    this.frequency = bucketFrequency;
    this.frequencyDisplayName = frequencyDisplayStrings[bucketFrequency];
    this.promptTitleFormat = dbRow.prompt_title_format;
    this.internalAlertedBucketEmptying =
      parseInt(dbRow.alerted_bucket_emptying, 10) === 1;
  }

  public get alertedBucketEmptying(): boolean {
    return this.internalAlertedBucketEmptying;
  }

  public async setIsPaused(db: Database, isPaused: boolean): Promise<void> {
    const rowsModified = await db.execute(
      'UPDATE prompt_buckets SET is_paused = $1 WHERE bucket_id = $2',
      [isPaused ? 1 : 0, this.id]
    );
    if (rowsModified !== 1) {
      throw new Error(
        'Unable to update the status of the prompt bucket in the database.'
      );
    }
  }

  public isFrequencyMet(
    lastDate: moment.Moment,
    currentDate: moment.Moment
  ): boolean {
    switch (this.frequency) {
      case BucketFrequency.Daily:
        return !lastDate.isSame(currentDate, 'day');
      case BucketFrequency.Weekly:
        return moment(lastDate).format('W') !== moment(currentDate).format('W');
      case BucketFrequency.Immediately:
        return false;
      default:
        throw new Error(`Unrecognized frequency type: '${this.frequency}'`);
    }
  }

  public convertPromptQueueLengthToDays(queueLength: number): number {
    switch (this.frequency) {
      case BucketFrequency.Daily:
        return queueLength;
      case BucketFrequency.Weekly:
        return queueLength * 7;
      case BucketFrequency.Immediately:
        return 0;
      default:
        throw new Error(
          "Unrecognized frequency type: '" + this.frequency + "'"
        );
    }
  }

  public async markAlertedEmptying(
    db: Database,
    hasAlerted: boolean
  ): Promise<void> {
    const rowsModified = await db.execute(
      'UPDATE prompt_buckets SET alerted_bucket_emptying = $1 WHERE bucket_id = $2',
      [hasAlerted ? 1 : 0, this.id]
    );
    if (rowsModified !== 1) {
      throw new Error('Unable to update the prompt bucket in the database.');
    }

    this.internalAlertedBucketEmptying = hasAlerted;
  }

  public async canUserSubmitTo(
    bot: DiscordIOClient,
    userId: string
  ): Promise<boolean> {
    if (!this.requiredRoleId) {
      return true;
    }

    const memberRoles = await getMemberRolesInServer(
      bot,
      this.serverId,
      userId
    );
    if (memberRoles.includes(this.requiredRoleId)) {
      return true;
    }

    return false;
  }
}
