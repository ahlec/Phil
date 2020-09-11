import {
  Client as DiscordIOClient,
  Server as DiscordIOServer,
} from 'discord.io';

import Member from './Member';
import Role from './Role';
import User from './User';
import TextChannel from './TextChannel';

interface ApiServerMember {
  nick?: string;
  user: {
    id: string;
    bot: boolean;
    username: string;
  };
  roles: ReadonlyArray<string>;
}

const DISCORD_CHANNEL_TYPE_TEXT = 0;

class Server {
  public constructor(
    private readonly internalClient: DiscordIOClient,
    private readonly internalServer: DiscordIOServer,
    public readonly id: string
  ) {}

  public get members(): readonly Member[] {
    const members: Member[] = [];
    for (const userId in this.internalServer.members) {
      const member = this.internalServer.members[userId];
      const user = this.internalClient.users[userId];
      if (!member || !user) {
        continue;
      }

      members.push(
        new Member(this.internalClient, member, this.id, new User(user, userId))
      );
    }

    return members;
  }

  public get name(): string {
    return this.internalServer.name;
  }

  public get roles(): readonly Role[] {
    return Object.values(this.internalServer.roles).map(
      (internalRole): Role =>
        new Role(this.internalClient, internalRole, this.id, internalRole.id)
    );
  }

  public getTextChannel(channelId: string): TextChannel | null {
    const channel = this.internalServer.channels[channelId];
    if (!channel) {
      return null;
    }

    if (channel.type !== DISCORD_CHANNEL_TYPE_TEXT) {
      return null;
    }

    return new TextChannel(channel, this, channel.id);
  }

  public async getMember(userId: string): Promise<Member | null> {
    const member = this.internalServer.members[userId];
    const user = this.internalClient.users[userId];
    if (member && user) {
      return new Member(
        this.internalClient,
        member,
        this.id,
        new User(user, userId)
      );
    }

    // Try querying the API directly. This is an attempt to fix a bug where new
    // users joining the server don't show up when we index into the object.
    // We can try removing this functionality when we leave 'discord.io'
    try {
      const apiMember = await this.fetchServerMemberFromApi(userId);
      if (apiMember) {
        return new Member(
          this.internalClient,
          apiMember,
          this.id,
          new User(apiMember.user, userId)
        );
      }
    } catch (err) {
      // Uhhhhh it's 4:13am and this code is going to be thrown away in the near future
      // eslint-disable-next-line no-console
      console.error(err);
    }

    return null;
  }

  public getRole(roleId: string): Role | null {
    const role = this.internalServer.roles[roleId];
    if (!role) {
      return null;
    }

    return new Role(this.internalClient, role, this.id, roleId);
  }

  public createRole(
    name: string,
    options: { color?: number } = {}
  ): Promise<Role> {
    const { color } = options;
    return new Promise((resolve, reject) => {
      this.internalClient.createRole(this.id, async (err, response) => {
        if (err) {
          reject(err);
          return;
        }

        const role = new Role(
          this.internalClient,
          response,
          this.id,
          response.id
        );

        try {
          await role.edit({ color, name });
          resolve(role);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  private fetchServerMemberFromApi(memberId: string): Promise<ApiServerMember> {
    return new Promise<ApiServerMember>((resolve, reject) => {
      let numApiInvocations = 0;
      const callServer = (offsetUserId: string | undefined): void => {
        ++numApiInvocations;
        this.internalClient.getMembers(
          {
            /**
             * We'll be hopefully moving away from discord.io which has been a huge
             * fucking thorn for way too long, especially with TypeScript.
             */
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            after: offsetUserId,
            /**
             * We'll be hopefully moving away from discord.io which has been a huge
             * fucking thorn for way too long, especially with TypeScript.
             */
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            serverID: this.id,
          },
          (err: unknown, data: ReadonlyArray<ApiServerMember>) => {
            if (err) {
              reject(err);
              return;
            }

            if (!data.length) {
              reject(
                new Error(
                  `Iterated entire member list for server '${this.id}' without finding member '${memberId}' (num calls: ${numApiInvocations})`
                )
              );
              return;
            }

            const targetMember = data.find(
              (member) => member.user.id === memberId
            );
            if (targetMember) {
              resolve(targetMember);
              return;
            }

            callServer(data[data.length - 1].user.id);
          }
        );
      };

      callServer(undefined);
    });
  }
}

export default Server;
