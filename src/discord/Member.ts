import * as DiscordIO from 'discord.io';
import { Snowflake } from './types';
import Role from './Role';

export default class Member {
  public constructor(
    private readonly discordIOClient: DiscordIO.Client,
    private readonly userId: Snowflake,
    private readonly serverId: Snowflake
  ) {}

  public get displayName(): string {
    const { member, user } = this;

    if (member && member.nick && member.nick.length > 0) {
      return member.nick;
    }

    return user.username;
  }

  private get user(): DiscordIO.User {
    const user = this.discordIOClient.users[this.userId];
    if (!user) {
      throw new Error('User no longer accessible');
    }

    return user;
  }

  private get server(): DiscordIO.Server {
    const server = this.discordIOClient.servers[this.serverId];
    if (!server) {
      throw new Error('Server no longer accessible');
    }

    return server;
  }

  private get member(): DiscordIO.Member {
    const { server } = this;
    const member = server.members[this.userId];
    if (!member) {
      throw new Error('Member no longer accessible or in server');
    }

    return member;
  }

  public hasRole(role: Role): boolean {
    const { member } = this;
    for (const memberRoleId of member.roles) {
      if (memberRoleId === role.roleId) {
        return true;
      }
    }

    return false;
  }
}
