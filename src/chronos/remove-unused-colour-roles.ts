'use strict';

import { Chrono } from './@types';
import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { Database } from '../phil/database';
import { DiscordPromises } from '../promises/discord';
import { ServerConfig } from '../phil/server-config';
import { BotUtils } from '../phil/utils';

interface RoleInfo {
    id : string;
    name : string;
}

export class RemoveUnusedColorRolesChrono implements Chrono {
    readonly handle = 'remove-unused-colour-roles';

    async process(bot : DiscordIOClient, db : Database, server : DiscordIOServer, now : Date) {
        let unusedColorRoles = this.getAllUnusedColorRoleIds(server);
        if (unusedColorRoles.length === 0) {
            return;
        }

        var message = 'The follow colour role(s) have been removed automatically because I could not find any users on your server who were still using them:\n';
        for (let role of unusedColorRoles) {
            await DiscordPromises.deleteRole(bot, server.id, role.id);
            message += '\n\t' + role.name + ' (ID: ' + role.id + ')';
        }

        const serverConfig = await ServerConfig.getFromId(db, server);
        DiscordPromises.sendEmbedMessage(bot, serverConfig.botControlChannel.id, {
            color: 0xB0E0E6,
            title: ':scroll: Unused Colour Roles Removed',
            description: message
        });
    }

    private getAllUnusedColorRoleIds(server : DiscordIOServer) : RoleInfo[] {
        var colorRoles = [];
        for (let roleId in server.roles) {
            if (!BotUtils.isHexColorRole(server, roleId)) {
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
