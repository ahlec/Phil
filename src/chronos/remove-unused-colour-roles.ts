import Member from '@phil/discord/Member';
import Role from '@phil/discord/Role';
import Server from '@phil/discord/Server';

import EmbedColor from '@phil/embed-color';
import Phil from '@phil/phil';
import { deleteRole, sendEmbedMessage } from '@phil/promises/discord';
import ServerConfig from '@phil/server-config';
import { isHexColorRole } from '@phil/utils';
import Chrono, { Logger, LoggerDefinition } from './@types';

interface RoleInfo {
  id: string;
  name: string;
}

const HANDLE = 'remove-unused-colour-roles';
export default class RemoveUnusedColorRolesChrono
  extends Logger
  implements Chrono {
  public readonly handle = HANDLE;
  public readonly requiredFeature = null; // Even if not using, still clean up

  public constructor(parentDefinition: LoggerDefinition) {
    super(new LoggerDefinition(HANDLE, parentDefinition));
  }

  public async process(
    phil: Phil,
    server: Server,
    serverConfig: ServerConfig
  ): Promise<void> {
    const unusedColorRoles = this.getAllUnusedColorRoleIds(server);
    if (unusedColorRoles.length === 0) {
      return;
    }

    let message =
      'The following colour role(s) have been removed automatically because I could not find any users on your server who were still using them:\n';
    for (const role of unusedColorRoles) {
      await deleteRole(phil.bot, server.id, role.id);
      message += '\n\t' + role.name + ' (ID: ' + role.id + ')';
    }

    sendEmbedMessage(phil.bot, serverConfig.botControlChannel.id, {
      color: EmbedColor.Info,
      description: message,
      title: ':scroll: Unused Colour Roles Removed',
    });
  }

  private getAllUnusedColorRoleIds(server: Server): RoleInfo[] {
    // Collect all of the defined color roles without checking whether they're
    // in use or not.
    const colorRoleIds = new Set<string>();
    const colorRoleNames = new Map<string, string>();
    server.roles.forEach((role: Role): void => {
      if (!isHexColorRole(role)) {
        return;
      }

      colorRoleIds.add(role.id);
      colorRoleNames.set(role.id, role.name);
    });

    // If we have no color roles, then early out for performance reasons.
    if (!colorRoleIds.size) {
      return [];
    }

    // Go through the server members and remove all color roles from the set
    // that are in use.
    server.members.forEach((member: Member): void => {
      member.roles.forEach((role: Role): void => {
        colorRoleIds.delete(role.id);
      });
    });

    // If we have no color roles remaining, then it means that all color roles
    // are currently in use.
    if (!colorRoleIds.size) {
      return [];
    }

    // Return the data we need for deleting and reporting to the channel.
    return Array.from(colorRoleIds).map(
      (roleId: string): RoleInfo => ({
        id: roleId,
        name: colorRoleNames.get(roleId) || roleId,
      })
    );
  }
}
