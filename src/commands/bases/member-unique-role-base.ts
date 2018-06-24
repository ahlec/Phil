import { Role as DiscordIORole, Server as DiscordIOServer } from 'discord.io';
import { IPublicMessage, IServerConfig } from 'phil';
import Database from '../../phil/database';
import Feature from '../../phil/features/feature';
import { HelpGroup } from '../../phil/help-groups';
import Phil from '../../phil/phil';
import { BotUtils } from '../../phil/utils';
import { DiscordPromises } from '../../promises/discord';
import ICommand from '../@types';

export default abstract class MemberUniqueRoleCommandBase<TData> implements ICommand {
    public abstract readonly name: string;
    public abstract readonly aliases: ReadonlyArray<string>;
    public abstract readonly feature: Feature;

    public readonly helpGroup = HelpGroup.Roles;
    public abstract readonly helpDescription: string;

    public abstract readonly versionAdded: number;

    public readonly isAdminCommand = false;
    public async processMessage(phil: Phil, message: IPublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const data = this.getDataFromCommandArgs(message.serverConfig, commandArgs);
        const newRole = await this.getRoleFromData(phil, message.server, data);

        await this.removeAllRolesInPoolFromUser(phil, message.server, message.userId);
        await DiscordPromises.giveRoleToUser(phil.bot, message.server.id, message.userId, newRole.id);

        BotUtils.sendSuccessMessage({
            bot: phil.bot,
            channelId: message.channelId,
            message: this.getSuccessMessage(message.serverConfig, data)
        });
    }

    protected abstract getMissingCommandArgsErrorMessage(serverConfig: IServerConfig): string;
    protected abstract getInvalidInputErrorMessage(input: string, serverConfig: IServerConfig): string;
    protected abstract tryParseInput(input: string): TData;
    protected abstract isRolePartOfUniquePool(role: DiscordIORole): boolean;
    protected abstract doesRoleMatchData(role: DiscordIORole, data: TData): boolean;
    protected abstract getRoleConfig(data: TData): DiscordPromises.IEditRoleOptions;
    protected abstract getSuccessMessage(serverConfig: IServerConfig, data: TData): string;

    private getDataFromCommandArgs(serverConfig: IServerConfig, commandArgs: ReadonlyArray<string>): TData {
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

    private async removeAllRolesInPoolFromUser(phil: Phil, server: DiscordIOServer, userId: string): Promise<void> {
        const member = server.members[userId];

        for (const roleId of member.roles) {
            const role = server.roles[roleId];
            if (!this.isRolePartOfUniquePool(role)) {
                continue;
            }

            await DiscordPromises.takeRoleFromUser(phil.bot, server.id, userId, roleId);
        }
    }

    private async getRoleFromData(phil: Phil, server: DiscordIOServer, data: TData): Promise<DiscordIORole> {
        for (const roleId in server.roles) {
            if (!server.roles.hasOwnProperty(roleId)) {
                continue;
            }

            const role = server.roles[roleId];
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
