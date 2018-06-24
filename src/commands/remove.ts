import { Server as DiscordIOServer } from 'discord.io';
import { IPublicMessage, IServerConfig } from 'phil';
import Database from '../phil/database';
import Features from '../phil/features/all-features';
import { HelpGroup } from '../phil/help-groups';
import MessageBuilder from '../phil/message-builder';
import Phil from '../phil/phil';
import Requestable from '../phil/requestables';
import BotUtils from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import ICommand from './@types';

export default class RemoveCommand implements ICommand {
    public readonly name = 'remove';
    public readonly aliases: ReadonlyArray<string> = [];
    public readonly feature = Features.Requestables;

    public readonly helpGroup = HelpGroup.Roles;
    public readonly helpDescription = 'Asks Phil to take away a requestable role that he has given you.';

    public readonly versionAdded = 7;

    public readonly isAdminCommand = false;
    public async processMessage(phil: Phil, message: IPublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        if (commandArgs.length === 0) {
            return this.processNoCommandArgs(phil, message);
        }

        const requestable = await Requestable.getFromRequestString(phil.db, message.server, commandArgs[0]);
        if (!requestable) {
            throw new Error('There is no requestable by the name of `' + commandArgs[0] + '`.');
        }

        this.ensureUserHasRole(message.server, message.userId, requestable);

        const result = await DiscordPromises.takeRoleFromUser(phil.bot, message.server.id, message.userId, requestable.role.id);
        BotUtils.sendSuccessMessage({
            bot: phil.bot,
            channelId: message.channelId,
            message: 'I\'ve removed the "' + requestable.role.name + '" role from you.'
        });
    }

    private ensureUserHasRole(server: DiscordIOServer, userId: string, requestable: Requestable) {
        const member = server.members[userId];

        if (member.roles.indexOf(requestable.role.id) < 0) {
            throw new Error('I haven\'t given you the "' + requestable.role.name + '" role.');
        }

        return requestable.role;
    }

    private async processNoCommandArgs(phil: Phil, message: IPublicMessage): Promise<any> {
        const userRequestables = await this.getAllRequestablesUserHas(phil.db, message.serverConfig, message.userId);
        if (userRequestables.length === 0) {
            throw new Error('I haven\'t given you any requestable roles yet. You use `' + message.serverConfig.commandPrefix + 'request` in order to obtain these roles.');
        }

        const reply = this.composeAllRequestablesList(message.serverConfig, userRequestables);
        return DiscordPromises.sendMessageBuilder(phil.bot, message.channelId, reply);
    }

    private async getAllRequestablesUserHas(db: Database, serverConfig: IServerConfig, userId: string): Promise<Requestable[]> {
        const requestables = await Requestable.getAllRequestables(db, serverConfig.server);
        if (requestables.length === 0) {
            throw new Error('There are no requestable roles defined. An admin should use `' + serverConfig.commandPrefix + 'define` to create some roles.');
        }

        const member = serverConfig.server.members[userId];
        const requestablesUserHas = [];
        for (const requestable of requestables) {
            if (member.roles.indexOf(requestable.role.id) >= 0) {
                requestablesUserHas.push(requestable);
            }
        }

        return requestablesUserHas;
    }

    private composeAllRequestablesList(serverConfig: IServerConfig, requestables: Requestable[]): MessageBuilder {
        const builder = new MessageBuilder();
        builder.append(':snowflake: These are the roles you can remove using `' + serverConfig.commandPrefix + 'remove`:\n');

        for (const requestable of requestables) {
            builder.append(this.composeRequestableListEntry(requestable));
        }

        const randomRequestable = BotUtils.getRandomArrayEntry(requestables);
        const randomRequestableString = BotUtils.getRandomArrayEntry(randomRequestable.requestStrings);

        builder.append('\nJust use one of the above requestable names, like `' + serverConfig.commandPrefix + 'remove ' + randomRequestableString + '`.');
        return builder;
    }

    private composeRequestableListEntry(requestable: Requestable): string {
        let entry = '- ';
        entry += BotUtils.stitchTogetherArray(requestable.requestStrings);
        entry += ' to remove the "' + requestable.role.name + '" role\n';
        return entry;
    }
}
