import { GuildMember as DiscordJsGuildMember } from 'discord.js';

import Role from './Role';
import User from './User';

class Member {
  public readonly user: User;

  public constructor(private readonly internalMember: DiscordJsGuildMember) {
    if (internalMember.partial) {
      throw new Error(
        `Cannot construct a new Member with a partial DiscordJS member (ID: ${internalMember.id})`
      );
    }

    this.user = new User(internalMember.user);
  }

  public get displayName(): string {
    if (this.internalMember.nickname) {
      return this.internalMember.nickname;
    }

    return this.user.username;
  }

  public get roles(): readonly Role[] {
    return this.internalMember.roles.cache.map(
      (rawRole): Role => new Role(rawRole)
    );
  }

  public async giveRole(role: Role): Promise<void> {
    await this.internalMember.roles.add(role.id);
  }

  public async removeRole(role: Role): Promise<void> {
    await this.internalMember.roles.remove(role.id);
  }
}

export default Member;
