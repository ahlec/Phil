import { Client as DiscordIOClient } from 'discord.io';

import Role from './Role';

interface InternalMember {
  nick?: string;
  roles: readonly string[];
}

interface InternalUser {
  username: string;
}

class Member {
  public constructor(
    private readonly internalClient: DiscordIOClient,
    private readonly internalUser: InternalUser,
    private readonly internalMember: InternalMember,
    private readonly serverId: string,
    public readonly userId: string
  ) {}

  public get displayName(): string {
    if (this.internalMember.nick) {
      return this.internalMember.nick;
    }

    return this.internalUser.username;
  }

  public get roles(): readonly Role[] {
    const roles: Role[] = [];
    this.internalMember.roles.forEach((roleId): void => {
      const role = this.internalClient.servers[this.serverId].roles[roleId];
      if (!role) {
        return;
      }

      roles.push(new Role(this.internalClient, role, this.serverId, roleId));
    });

    return roles;
  }

  public giveRole(role: Role): Promise<void> {
    return new Promise((resolve, reject) => {
      this.internalClient.addToRole(
        {
          roleID: role.id,
          serverID: this.serverId,
          userID: this.userId,
        },
        (err) => {
          if (err) {
            reject(err);
            return;
          }

          resolve();
        }
      );
    });
  }

  public removeRole(role: Role): Promise<void> {
    return new Promise((resolve, reject) => {
      this.internalClient.removeFromRole(
        {
          roleID: role.id,
          serverID: this.serverId,
          userID: this.userId,
        },
        (err) => {
          if (err) {
            reject(err);
            return;
          }

          resolve();
        }
      );
    });
  }
}

export default Member;
