import {
  Permissions as DiscordJSPermissions,
  Role as DiscordJSRole,
} from 'discord.js';
import ServerPermissions from './ServerPermissions';

class Role {
  public constructor(private readonly internalRole: DiscordJSRole) {}

  public get id(): string {
    return this.internalRole.id;
  }

  public get name(): string {
    return this.internalRole.name;
  }

  public hasPermission(permission: ServerPermissions): boolean {
    let permissionBitFlag: number;
    switch (permission) {
      case ServerPermissions.GeneralAdministrator: {
        permissionBitFlag = DiscordJSPermissions.FLAGS.ADMINISTRATOR;
        break;
      }
    }

    return this.internalRole.permissions.has(permissionBitFlag);
  }

  public async edit({
    name,
    color,
  }: {
    name?: string;
    color?: number;
  }): Promise<void> {
    await this.internalRole.edit({
      color,
      name,
    });
  }

  public async delete(): Promise<void> {
    if (this.internalRole.deleted) {
      throw new Error('This role has already been deleted.');
    }

    await this.internalRole.delete();
  }
}

export default Role;
