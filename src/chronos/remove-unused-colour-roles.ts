import { Server as DiscordIOServer } from 'discord.io';
import EmbedColor from '../embed-color';
import Phil from '../phil';
import { deleteRole, sendEmbedMessage } from '../promises/discord';
import ServerConfig from '../server-config';
import { doesMemberUseRole, isHexColorRole } from '../utils';
import Chrono, { Logger, LoggerDefinition } from './@types';

interface RoleInfo {
  id: string;
  name: string;
}

const HANDLE = 'remove-unused-colour-roles';
export default class RemoveUnusedColorRolesChrono extends Logger
  implements Chrono {
  public readonly handle = HANDLE;
  public readonly requiredFeature = null; // Even if not using, still clean up

  public constructor(parentDefinition: LoggerDefinition) {
    super(new LoggerDefinition(HANDLE, parentDefinition));
  }

  public async process(phil: Phil, serverConfig: ServerConfig) {
    const unusedColorRoles = this.getAllUnusedColorRoleIds(serverConfig.server);
    if (unusedColorRoles.length === 0) {
      return;
    }

    let message =
      'The following colour role(s) have been removed automatically because I could not find any users on your server who were still using them:\n';
    for (const role of unusedColorRoles) {
      await deleteRole(phil.bot, serverConfig.server.id, role.id);
      message += '\n\t' + role.name + ' (ID: ' + role.id + ')';
    }

    sendEmbedMessage(phil.bot, serverConfig.botControlChannel.id, {
      color: EmbedColor.Info,
      description: message,
      title: ':scroll: Unused Colour Roles Removed',
    });
  }

  private getAllUnusedColorRoleIds(server: DiscordIOServer): RoleInfo[] {
    const colorRoles = [];
    for (const roleId in server.roles) {
      const role = server.roles[roleId];
      if (!role || !isHexColorRole(role)) {
        continue;
      }

      if (!this.isRoleUnused(server, roleId)) {
        continue;
      }

      colorRoles.push({
        id: roleId,
        name: server.roles[roleId].name,
      });
    }

    return colorRoles;
  }

  private isRoleUnused(server: DiscordIOServer, roleId: string): boolean {
    for (const memberId in server.members) {
      if (doesMemberUseRole(server.members[memberId], roleId)) {
        return false;
      }
    }

    return true;
  }
}
