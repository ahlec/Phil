import * as DiscordIO from 'discord.io';
import { Snowflake } from './types';
import Channel from './Channel';

export default class Server {
  public constructor(
    private readonly discordIOClient: DiscordIO.Client,
    public readonly serverId: Snowflake
  ) {}

  private get server(): DiscordIO.Server {
    const server = this.discordIOClient.servers[this.serverId];
    if (!server) {
      throw new Error('Server is no longer accessible');
    }

    return server;
  }

  public getChannel(channelId: Snowflake): Channel | null {
    const { server } = this;
    const channel = server.channels[channelId];
    if (!channel) {
      return null;
    }

    return new Channel(this.discordIOClient, this.serverId, channelId);
  }
}
