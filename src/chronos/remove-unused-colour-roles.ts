'use strict';

import { Chrono } from './@types';
import { Phil } from '../phil/phil';
import { Server as DiscordIOServer } from 'discord.io';
import { DiscordPromises } from '../promises/discord';
import { ServerConfig } from '../phil/server-config';
import { BotUtils } from '../phil/utils';

interface RoleInfo {
    id : string;
    name : string;
}

export class RemoveUnusedColorRolesChrono implements Chrono {
    readonly handle = 'remove-unused-colour-roles';

    async process(phil : Phil, serverConfig : ServerConfig, now : Date) {
        let unusedColorRoles = this.getAllUnusedColorRoleIds(serverConfig.server);
        if (unusedColorRoles.length === 0) {
            return;
        }

        var message = 'The following colour role(s) have been removed automatically because I could not find any users on your server who were still using them:\n';
        for (let role of unusedColorRoles) {
            await DiscordPromises.deleteRole(phil.bot, serverConfig.server.id, role.id);
            message += '\n\t' + role.name + ' (ID: ' + role.id + ')';
        }

        DiscordPromises.sendEmbedMessage(phil.bot, serverConfig.botControlChannel.id, {
            color: 0xB0E0E6,
            title: ':scroll: Unused Colour Roles Removed',
            description: message
        });
    }

    private getAllUnusedColorRoleIds(server : DiscordIOServer) : RoleInfo[] {
        var colorRoles = [];
        for (let roleId in server.roles) {
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

    private isRoleUnused(server : DiscordIOServer, roleId : string) : boolean {
        for (let memberId in server.members) {
            if (BotUtils.doesMemberUseRole(server.members[memberId], roleId)) {
                return false;
            }
        }

        return true;
    }
}
