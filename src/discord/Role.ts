import { Client as DiscordIOClient, Role as DiscordIORole } from 'discord.io';

class Role {
  public constructor(
    private readonly internalClient: DiscordIOClient,
    private readonly internalRole: DiscordIORole,
    private readonly serverId: string,
    public readonly id: string
  ) {}

  public get name(): string {
    return this.internalRole.name;
  }

  public edit({
    name,
    color,
  }: {
    name?: string;
    color?: number;
  }): Promise<void> {
    return new Promise((resolve, reject) => {
      this.internalClient.editRole(
        {
          color: color,
          hoist: undefined,
          mentionable: undefined,
          name: name,
          permissions: undefined,
          position: undefined,
          roleID: this.id,
          serverID: this.serverId,
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

export default Role;
