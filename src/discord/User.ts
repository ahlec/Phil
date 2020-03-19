import * as DiscordIO from 'discord.io';
import { Snowflake } from './types';
import Server from './Server';

export default class User {
  public constructor(
    private readonly discordIOClient: DiscordIO.Client,
    private readonly userId: Snowflake
  ) {}

  public getNameInServer(server: Server): string {
    const rawServer = this.discordIOClient.servers[server.serverId];
    if (!rawServer) {
      throw new Error('Server is no longer accessible.');
    }

    const rawUser = this.discordIOClient.users[this.userId];
    if (!rawUser) {
      throw new Error('User is no longer known.');
    }

    const rawMember = rawServer.members[this.userId];
    if (!rawMember) {
      throw new Error('User is no longer in server.');
    }

    return rawMember.nick || rawUser.username;
  }

  public isInServer(server: Server): boolean {
    const rawServer = this.discordIOClient.servers[server.serverId];
    if (!rawServer) {
      throw new Error('Server is no longer accessible');
    }

    return !!rawServer.members[this.userId];
  }
}
