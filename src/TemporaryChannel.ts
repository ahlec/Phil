import {
  Channel as DiscordIOChannel,
  Client as DiscordIOClient,
  Member as DiscordIOMember,
  Server as DiscordIOServer,
} from 'discord.io';
import * as moment from 'moment';
import Database from './database';
import { deleteChannel } from './promises/discord';

interface GetQueryResult {
  channel_id: string;
  server_id: string;
  creator_user_id: string;
  created: string;
  expiration: string;
  deletion_time: string;
  has_been_extended: string;
  topic: string;
}

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

  public readonly creator: DiscordIOMember | null;
  public readonly created: moment.Moment;
  public readonly expiration: moment.Moment;
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
    this.deletionTime = moment(result.deletion_time);
    this.hasBeenExtended = result.has_been_extended === '1';
    this.topic = result.topic;
  }

  public async hideChannel(client: DiscordIOClient): Promise<boolean> {
    return false;
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