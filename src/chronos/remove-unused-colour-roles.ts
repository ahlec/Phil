import Database from '@phil/database';

import Client from '@phil/discord/Client';
import Member from '@phil/discord/Member';
import Role from '@phil/discord/Role';
import Server from '@phil/discord/Server';

import ServerConfig from '@phil/server-config';
import { isHexColorRole } from '@phil/utils';
import Chrono, { Logger, LoggerDefinition } from './@types';

const HANDLE = 'remove-unused-colour-roles';
export default class RemoveUnusedColorRolesChrono
  extends Logger
  implements Chrono {
  public readonly databaseId = 5;
  public readonly handle = HANDLE;
  public readonly requiredFeature = null; // Even if not using, still clean up

  public constructor(parentDefinition: LoggerDefinition) {
    super(new LoggerDefinition(HANDLE, parentDefinition));
  }

  public async process(
    discordClient: Client,
    database: Database,
    server: Server,
    serverConfig: ServerConfig
  ): Promise<void> {
    const unusedColorRoles = this.getAllUnusedColorRoleIds(server);
    if (!unusedColorRoles.length) {
      return;
    }

    // Delete all of the roles
    await Promise.all(unusedColorRoles.map((role) => role.delete()));

    const message = `The following colour role(s) have been removed automatically because I could not find any users on your server who were still using them:\n${unusedColorRoles
      .map((role): string => `${role.name} (ID: ${role.id})`)
      .join('\n\t')}`;

    await serverConfig.botControlChannel.sendMessage({
      color: 'powder-blue',
      description: message,
      fields: null,
      footer: null,
      title: ':scroll: Unused Colour Roles Removed',
      type: 'embed',
    });
  }

  private getAllUnusedColorRoleIds(server: Server): readonly Role[] {
    // Collect all of the defined color roles without checking whether they're
    // in use or not.
    const allColorRoles = new Map<string, Role>();
    server.roles.forEach((role: Role): void => {
      if (!isHexColorRole(role)) {
        return;
      }

      allColorRoles.set(role.id, role);
    });

    // If we have no color roles, then early out for performance reasons.
    if (!allColorRoles.size) {
      return [];
    }

    // Go through the server members and remove all color roles from the set
    // that are in use.
    server.members.forEach((member: Member): void => {
      member.roles.forEach((role: Role): void => {
        allColorRoles.delete(role.id);
      });
    });

    // If we have no color roles remaining, then it means that all color roles
    // are currently in use.
    if (!allColorRoles.size) {
      return [];
    }

    // Return the data we need for deleting and reporting to the channel.
    return Array.from(allColorRoles.values());
  }
}
