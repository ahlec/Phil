import {
  Channel as DiscordIOChannel,
  Client as DiscordIOClient,
  Member as DiscordIOMember,
  Permissions,
  Server as DiscordIOServer,
} from 'discord.io';
import * as moment from 'moment';
import Database from './database';
import { deleteChannel, editChannelRolePermissions } from './promises/discord';

interface TableSchema {
  channel_id: string;
  server_id: string;
  creator_user_id: string;
  created: string;
  expiration: string;
  has_hidden: string;
  deletion_time: string;
  num_times_extended: string;
  topic: string;
}

const ONE_SECOND = 1000;
const ONE_MINUTE = ONE_SECOND * 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;

export const MAX_NUMBER_EXISTANT_CHANNELS_PER_USER: number = 2;
export const INITIAL_CHANNEL_DURATION_MILLISECONDS: number = ONE_HOUR * 3;
export const CHANNEL_RENEWAL_DURATION_MILLISECONDS: number = ONE_HOUR * 3;
export const MAX_CHANNEL_RENEWALS: number = 1;
export const CHANNEL_DELETION_DURATION_MILLISECONDS: number = ONE_DAY;
export const CATEGORY_NAME: string = 'Temporary Channels';

export default class TemporaryChannel {
  public static async get(
    database: Database,
    channelId: string,
    server: DiscordIOServer
  ): Promise<TemporaryChannel | null> {
    const result = await database.querySingle<TableSchema>(
      `SELECT
        *
      FROM
        temporary_channels
      WHERE
        channel_id = $1 AND
        server_id = $2`,
      [channelId, server.id]
    );
    if (!result) {
      return null;
    }

    const channel = server.channels[channelId];
    if (!channel) {
      return null;
    }

    return new TemporaryChannel(channel, server, result);
  }

  public static async countUsersChannels(
    database: Database,
    server: DiscordIOServer,
    userId: string
  ): Promise<number> {
    const result = await database.querySingle<{ count: string }>(
      `SELECT
        count(*)
      FROM
        temporary_channels
      WHERE
        creator_user_id = $1 AND
        server_id = $2`,
      [userId, server.id]
    );
    if (!result) {
      return 0;
    }

    const parsed = parseInt(result.count, 10);
    if (isNaN(parsed) || parsed < 0) {
      return 0;
    }

    return parsed;
  }

  public static async create(
    database: Database,
    channel: DiscordIOChannel,
    server: DiscordIOServer,
    userId: string,
    topic: string
  ): Promise<TemporaryChannel | null> {
    const now = moment.utc();
    const expiration = moment(now).add(
      INITIAL_CHANNEL_DURATION_MILLISECONDS,
      'milliseconds'
    );
    const deletion = moment(now).add(
      CHANNEL_DELETION_DURATION_MILLISECONDS,
      'milliseconds'
    );
    const creation = await database.query<TableSchema>(
      `INSERT INTO
        temporary_channels(
          channel_id,
          server_id,
          creator_user_id,
          created,
          expiration,
          has_hidden,
          deletion_time,
          num_times_extended,
          topic
        )
      VALUES
        ($1, $2, $3, $4, $5, E'0', $6, 0, $7)
      RETURNING
        *`,
      [channel.id, server.id, userId, now, expiration, deletion, topic]
    );

    if (!creation.rowCount) {
      return null;
    }

    return new TemporaryChannel(channel, server, creation.rows[0]);
  }

  public readonly creator: DiscordIOMember | null;
  public readonly created: moment.Moment;
  public readonly expiration: moment.Moment;
  public readonly hasHidden: boolean;
  public readonly deletionTime: moment.Moment;
  public readonly numTimesExtended: number;
  public readonly topic: string;

  private constructor(
    public readonly channel: DiscordIOChannel,
    public readonly server: DiscordIOServer,
    result: TableSchema
  ) {
    this.creator = server.members[result.creator_user_id] || null;
    this.created = moment(result.created);
    this.expiration = moment(result.expiration);
    this.hasHidden = result.has_hidden === '1';
    this.deletionTime = moment(result.deletion_time);
    this.numTimesExtended = parseInt(result.num_times_extended, 10);
    this.topic = result.topic;
  }

  public async hideChannel(
    client: DiscordIOClient,
    database: Database
  ): Promise<boolean> {
    editChannelRolePermissions(client, this.channel.id, this.server.id, {
      deny: [
        Permissions.TEXT_READ_MESSAGES,
        Permissions.TEXT_SEND_MESSAGES,
        Permissions.TEXT_READ_MESSAGE_HISTORY,
      ],
    });
    const numRowsUpdated = await database.execute(
      `UPDATE
        temporary_channels
      SET
        has_hidden = E'1'
      WHERE
        channel_id = $1 AND
        server_id = $2`,
      [this.channel.id, this.server.id]
    );
    return numRowsUpdated >= 1;
  }

  public async deleteChannel(
    client: DiscordIOClient,
    database: Database
  ): Promise<boolean> {
    await deleteChannel(client, this.channel.id);
    const numRowsDeleted = await database.execute(
      `DELETE FROM
        temporary_channels
      WHERE
        channel_id = $1 AND
        server_id = $2`,
      [this.channel.id, this.server.id]
    );
    return numRowsDeleted >= 1;
  }
}
