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

interface GetQueryResult {
  channel_id: string;
  server_id: string;
  creator_user_id: string;
  created: string;
  expiration: string;
  has_hidden: string;
  deletion_time: string;
  has_been_extended: string;
  topic: string;
}

const ONE_SECOND = 1000;
const ONE_MINUTE = ONE_SECOND * 60;
const ONE_HOUR = ONE_MINUTE * 60;
const ONE_DAY = ONE_HOUR * 24;

export const MAX_NUMBER_EXISTANT_CHANNELS_PER_USER = 2;
export const INITIAL_CHANNEL_DURATION_MILLISECONDS = ONE_HOUR * 3;
export const CHANNEL_RENEWAL_DURATION_MILLISECONDS = ONE_HOUR * 3;
export const MAX_CHANNEL_RENEWALS = 1;
export const CHANNEL_DELETION_DURATION_MILLISECONDS = ONE_DAY;

export default class TemporaryChannel {
  public static async get(
    database: Database,
    channelId: string,
    server: DiscordIOServer
  ): Promise<TemporaryChannel | null> {
    const result = await database.querySingle<GetQueryResult>(
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

  public readonly creator: DiscordIOMember | null;
  public readonly created: moment.Moment;
  public readonly expiration: moment.Moment;
  public readonly hasHidden: boolean;
  public readonly deletionTime: moment.Moment;
  public readonly hasBeenExtended: boolean;
  public readonly topic: string;

  private constructor(
    public readonly channel: DiscordIOChannel,
    public readonly server: DiscordIOServer,
    result: GetQueryResult
  ) {
    this.creator = server.members[result.creator_user_id] || null;
    this.created = moment(result.created);
    this.expiration = moment(result.expiration);
    this.hasHidden = result.has_hidden === '1';
    this.deletionTime = moment(result.deletion_time);
    this.hasBeenExtended = result.has_been_extended === '1';
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
