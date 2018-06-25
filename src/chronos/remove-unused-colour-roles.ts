import { Server as DiscordIOServer } from 'discord.io';
import Phil from '../phil';
import { DiscordPromises } from '../promises/discord';
import ServerConfig from '../server-config';
import { BotUtils } from '../utils';
import IChrono from './@types';

interface IRoleInfo {
    id: string;
    name: string;
}

export default class RemoveUnusedColorRolesChrono implements IChrono {
    public readonly handle = 'remove-unused-colour-roles';

    public async process(phil: Phil, serverConfig: ServerConfig, now: Date) {
        const unusedColorRoles = this.getAllUnusedColorRoleIds(serverConfig.server);
        if (unusedColorRoles.length === 0) {
            return;
        }

        let message = 'The following colour role(s) have been removed automatically because I could not find any users on your server who were still using them:\n';
        for (const role of unusedColorRoles) {
            await DiscordPromises.deleteRole(phil.bot, serverConfig.server.id, role.id);
            message += '\n\t' + role.name + ' (ID: ' + role.id + ')';
        }

        DiscordPromises.sendEmbedMessage(phil.bot, serverConfig.botControlChannel.id, {
            color: 0xB0E0E6,
            description: message,
            title: ':scroll: Unused Colour Roles Removed'
        });
    }

    private getAllUnusedColorRoleIds(server: DiscordIOServer): IRoleInfo[] {
        const colorRoles = [];
        for (const roleId in server.roles) {
            if (!server.roles.hasOwnProperty(roleId)) {
                continue;
            }

            const role = server.roles[roleId];
            if (!role || !BotUtils.isHexColorRole(role)) {
                continue;
            }

            if (!this.isRoleUnused(server, roleId)) {
                continue;
            }

            colorRoles.push({
                id: roleId,
                name: server.roles[roleId].name
            });
        }

        return colorRoles;
    }

    private isRoleUnused(server: DiscordIOServer, roleId: string): boolean {
        for (const memberId in server.members) {
            if (BotUtils.doesMemberUseRole(server.members[memberId], roleId)) {
                return false;
            }
        }

        return true;
    }
}
