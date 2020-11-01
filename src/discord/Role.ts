import * as discord from 'discord.io';
import ServerPermissions from './ServerPermissions';

class Role {
  public constructor(
    private readonly internalClient: discord.Client,
    private readonly internalRole: discord.Role,
    private readonly serverId: string,
    public readonly id: string
  ) {}

  public get name(): string {
    return this.internalRole.name;
  }

  public hasPermission(permission: ServerPermissions): boolean {
    let discordIOPermission: number;
    switch (permission) {
      case ServerPermissions.GeneralAdministrator: {
        discordIOPermission = discord.Permissions.GENERAL_ADMINISTRATOR;
        break;
      }
    }

    // TODO: Return to this function and determine if it's actually working?
    /* tslint:disable:no-bitwise */
    const binary = (this.internalRole.permissions >>> 0).toString(2).split('');
    /* tslint:enable:no-bitwise */
    for (const strBit of binary) {
      const bit = parseInt(strBit, 10);
      if (bit === discordIOPermission) {
        return true;
      }
    }

    return false;
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

  public delete(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.internalClient.deleteRole(
        {
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
