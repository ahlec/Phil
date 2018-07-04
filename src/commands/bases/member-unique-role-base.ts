import { Role as DiscordIORole, Server as DiscordIOServer } from 'discord.io';
import Feature from '../../features/feature';
import { HelpGroup } from '../../help-groups';
import PublicMessage from '../../messages/public';
import PermissionLevel from '../../permission-level';
import Phil from '../../phil';
import { DiscordPromises } from '../../promises/discord';
import ServerConfig from '../../server-config';
import { BotUtils } from '../../utils';
import ICommand from '../@types';

export default abstract class MemberUniqueRoleCommandBase<TData> implements ICommand {
    public abstract readonly name: string;
    public abstract readonly aliases: ReadonlyArray<string>;
    public abstract readonly feature: Feature;
    public readonly permissionLevel = PermissionLevel.General;

    public readonly helpGroup = HelpGroup.Roles;
    public abstract readonly helpDescription: string;

    public abstract readonly versionAdded: number;

    public async processMessage(phil: Phil, message: PublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
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

    protected abstract getMissingCommandArgsErrorMessage(serverConfig: ServerConfig): string;
    protected abstract getInvalidInputErrorMessage(input: string, serverConfig: ServerConfig): string;
    protected abstract tryParseInput(input: string): TData;
    protected abstract isRolePartOfUniquePool(role: DiscordIORole): boolean;
    protected abstract doesRoleMatchData(role: DiscordIORole, data: TData): boolean;
    protected abstract getRoleConfig(data: TData): DiscordPromises.IEditRoleOptions;
    protected abstract getSuccessMessage(serverConfig: ServerConfig, data: TData): string;

    private getDataFromCommandArgs(serverConfig: ServerConfig, commandArgs: ReadonlyArray<string>): TData {
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
