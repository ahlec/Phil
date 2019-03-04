import {
  Channel as DiscordIOChannel,
  Client as DiscordIOClient,
  Member as DiscordIOMember,
  Permissions,
  Server as DiscordIOServer,
} from 'discord.io';
import * as moment from 'moment';
import Database from './database';
import { ChannelType } from './DiscordConstants';
import { durationToStr, ONE_DAY, ONE_HOUR } from './Durations';
import {
  createChannel,
  deleteChannel,
  editChannelRolePermissions,
  pinMessage,
  sendEmbedMessage,
} from './promises/discord';
import ServerConfig from './server-config';

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

export const MAX_NUMBER_EXISTANT_CHANNELS_PER_USER: number = 2;
export const INITIAL_CHANNEL_DURATION_MILLISECONDS: number = ONE_HOUR * 3;
export const CHANNEL_RENEWAL_DURATION_MILLISECONDS: number = ONE_HOUR * 3;
export const MAX_CHANNEL_RENEWALS: number = 1;
export const CHANNEL_DELETION_DURATION_MILLISECONDS: number = ONE_DAY;
export const CATEGORY_NAME: string = 'Temporary Channels';

async function getTempChannelCategoryId(
  client: DiscordIOClient,
  server: DiscordIOServer
): Promise<string> {
  const channels = Object.values(server.channels);
  const category = channels.find(
    channel =>
      channel.type === ChannelType.Category && channel.name === CATEGORY_NAME
  );
  if (category) {
    return category.id;
  }

  const newCategory = await createChannel(
    client,
    server.id,
    'category',
    CATEGORY_NAME
  );
  return newCategory.id;
}

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
    client: DiscordIOClient,
    database: Database,
    serverConfig: ServerConfig,
    userId: string,
    channelName: string,
    topic: string
  ): Promise<TemporaryChannel> {
    const categoryId = await getTempChannelCategoryId(
      client,
      serverConfig.server
    );
    const channel = await createChannel(
      client,
      serverConfig.serverId,
      'text',
      channelName,
      categoryId
    );

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
      [
        channel.id,
        serverConfig.serverId,
        userId,
        now,
        expiration,
        deletion,
        topic,
      ]
    );

    if (!creation.rowCount) {
      await deleteChannel(client, channel.id);
      throw new Error('Could not insert into the database');
    }

    const tempChannel = new TemporaryChannel(
      channel,
      serverConfig.server,
      creation.rows[0]
    );
    await tempChannel.publishCreationMessage(client, serverConfig);
    return tempChannel;
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

  private async publishCreationMessage(
    client: DiscordIOClient,
    serverConfig: ServerConfig
  ): Promise<void> {
    const createdStr = this.created.format('D MMMM YYYY \\a\\t h:mma');
    const durationStr = durationToStr(INITIAL_CHANNEL_DURATION_MILLISECONDS);
    const renewalStr = `${MAX_CHANNEL_RENEWALS} ${
      MAX_CHANNEL_RENEWALS === 1 ? 'time' : 'times'
    }`;
    const renewCommand = `${serverConfig.commandPrefix}renew`;
    const messageId = await sendEmbedMessage(client, this.channel.id, {
      color: 'info',
      description: `Welcome to <#${
        this.channel.id
      }>. This is a temporary channel that was created on **${createdStr}** UTC. The channel will be around for **${durationStr}**, but the channel creator (<@${
        this.creator!.id
      }>) can renew the channel **${renewalStr}** by using the \`${renewCommand}\` command in this channel.

      The topic for this channel is: **${this.topic}**.

      Enjoy yourselves!!`,
      title: `Welcome to ${this.topic}!`,
    });
    await pinMessage(client, this.channel.id, messageId);
  }
}
