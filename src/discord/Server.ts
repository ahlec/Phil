import {
  DiscordAPIError,
  Guild as DiscordJsGuild,
  TextChannel as DiscordJsTextChannel,
} from 'discord.js';

import Member from './Member';
import Role from './Role';
import TextChannel from './TextChannel';

class Server {
  public constructor(private readonly internalGuild: DiscordJsGuild) {}

  public get id(): string {
    return this.internalGuild.id;
  }

  public get everyoneRole(): Role {
    return new Role(this.internalGuild.roles.everyone);
  }

  public async getAllMembers(): Promise<readonly Member[]> {
    const rawMembers = await this.internalGuild.members.fetch();
    return rawMembers.map(
      (internalMember): Member => new Member(internalMember)
    );
  }

  public get name(): string {
    return this.internalGuild.name;
  }

  public async getAllRoles(): Promise<readonly Role[]> {
    const rolesManager = await this.internalGuild.roles.fetch();
    return rolesManager.cache.map(
      (internalRole): Role => new Role(internalRole)
    );
  }

  public get systemChannel(): TextChannel | null {
    if (!this.internalGuild.systemChannel) {
      return null;
    }

    return new TextChannel(this.internalGuild.systemChannel, this);
  }

  public get textChannels(): readonly TextChannel[] {
    const channels: TextChannel[] = [];
    this.internalGuild.channels.cache.forEach((internalChannel): void => {
      if (!(internalChannel instanceof DiscordJsTextChannel)) {
        return;
      }

      channels.push(new TextChannel(internalChannel, this));
    });

    return channels;
  }

  public getTextChannel(channelId: string): TextChannel | null {
    const internalChannel = this.internalGuild.channels.resolve(channelId);
    if (!internalChannel) {
      return null;
    }

    if (!(internalChannel instanceof DiscordJsTextChannel)) {
      return null;
    }

    return new TextChannel(internalChannel, this);
  }

  public async getMember(userId: string): Promise<Member | null> {
    try {
      const rawMember = await this.internalGuild.members.fetch(userId);
      return new Member(rawMember);
    } catch (err) {
      if (err instanceof DiscordAPIError && err.httpStatus === 404) {
        return null;
      }

      throw err;
    }
  }

  public async getOwner(): Promise<Member> {
    if (!this.internalGuild.owner) {
      throw new Error(
        `Owner (${this.internalGuild.ownerID}) of server '${this.internalGuild.id}' is not a member of server?`
      );
    }

    return new Member(this.internalGuild.owner);
  }

  public getRole(roleId: string): Role | null {
    const internalRole = this.internalGuild.roles.resolve(roleId);
    if (!internalRole) {
      return null;
    }

    return new Role(internalRole);
  }

  public async createRole(
    name: string,
    options: { color?: number } = {}
  ): Promise<Role> {
    const { color } = options;
    const internalRole = await this.internalGuild.roles.create({
      data: {
        color,
        name,
      },
    });
    return new Role(internalRole);
  }
}

export default Server;
