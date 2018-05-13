'use strict';

import { Command } from '../@types';
import { Phil } from '../../phil/phil';
import { HelpGroup } from '../../phil/help-groups';
import { Server as DiscordIOServer, Role as DiscordIORole } from 'discord.io';
import { DiscordMessage } from '../../phil/discord-message';
import { Database } from '../../phil/database';
import { BotUtils } from '../../phil/utils';
import { DiscordPromises } from '../../promises/discord';
import { Feature } from '../../phil/features';
import { ServerConfig } from '../../phil/server-config';

export abstract class MemberUniqueRoleCommandBase<TData> implements Command {
    abstract readonly name : string;
    abstract readonly aliases : string[];
    abstract readonly feature : Feature;

    readonly helpGroup = HelpGroup.Roles;
    abstract readonly helpDescription : string = null;

    abstract readonly versionAdded : number;

    readonly publicRequiresAdmin = true;
    async processPublicMessage(phil : Phil, message : DiscordMessage, commandArgs : string[]) : Promise<any> {
        const data = this.getDataFromCommandArgs(message.serverConfig, commandArgs);
        const newRole = await this.getRoleFromData(phil, message.server, data);

        await this.removeAllRolesInPoolFromUser(phil, message.server, message.userId);
        await DiscordPromises.giveRoleToUser(phil.bot, message.server.id, message.userId, newRole.id);

        BotUtils.sendSuccessMessage({
            bot: phil.bot,
            channelId: message.channelId,
            message: this.getSuccessMessage(data)
        });
    }

    protected abstract getMissingCommandArgsErrorMessage(serverConfig : ServerConfig) : string;
    protected abstract getInvalidInputErrorMessage(input : string, serverConfig : ServerConfig) : string;
    protected abstract tryParseInput(input : string) : TData;
    protected abstract isRolePartOfUniquePool(role : DiscordIORole) : boolean;
    protected abstract doesRoleMatchData(role : DiscordIORole, data : TData) : boolean;
    protected abstract getRoleConfig(data : TData) : DiscordPromises.EditRoleOptions;
    protected abstract getSuccessMessage(data : TData) : string;

    private getDataFromCommandArgs(serverConfig : ServerConfig, commandArgs : string[]) : TData {
        if (commandArgs.length === 0) {
            const errorMessage = this.getMissingCommandArgsErrorMessage(serverConfig);
            throw new Error(errorMessage);
        }

        const data = this.tryParseInput(commandArgs[0]);
        if (!data) {
            const errorMessage = this.getInvalidInputErrorMessage(commandArgs[0], serverConfig);
            throw new Error(errorMessage);
        }

        return data;
    }

    private async removeAllRolesInPoolFromUser(phil : Phil, server : DiscordIOServer, userId : string) : Promise<void> {
        const member = server.members[userId];

        for (let roleId of member.roles) {
            const role = server.roles[roleId];
            if (!this.isRolePartOfUniquePool(role)) {
                continue;
            }

            await DiscordPromises.takeRoleFromUser(phil.bot, server.id, userId, roleId);
        }
    }

    private async getRoleFromData(phil : Phil, server : DiscordIOServer, data : TData) : Promise<DiscordIORole> {
        for (let roleId in server.roles) {
            let role = server.roles[roleId];
            if (this.doesRoleMatchData(role, data)) {
                return role;
            }
        }

        const newRole = await DiscordPromises.createRole(phil.bot, server.id);
        const roleOptions = this.getRoleConfig(data);
        await DiscordPromises.editRole(phil.bot, server.id, newRole.id, roleOptions);
        return newRole;
    }
}
