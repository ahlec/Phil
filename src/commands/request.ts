import { IPublicMessage, IServerConfig } from 'phil';
import Features from '../phil/features/all-features';
import { HelpGroup } from '../phil/help-groups';
import MessageBuilder from '../phil/message-builder';
import Phil from '../phil/phil';
import Requestable from '../phil/requestables';
import ServerConfig from '../phil/server-config';
import BotUtils from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import ICommand from './@types';

export default class RequestCommand implements ICommand {
    public readonly name = 'request';
    public readonly aliases = ['giveme'];
    public readonly feature = Features.Requestables;

    public readonly helpGroup = HelpGroup.Roles;
    public readonly helpDescription = 'Asks Phil to give you a role. Using the command by itself will show you all of the roles he can give you.';

    public readonly versionAdded = 1;

    public readonly isAdminCommand = false;
    public async processMessage(phil: Phil, message: IPublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        if (commandArgs.length === 0) {
            return this.processNoCommandArgs(phil, message);
        }

        const requestable = await Requestable.getFromRequestString(phil.db, message.server, commandArgs[0]);
        if (!requestable) {
            throw new Error('There is no requestable by the name of `' + commandArgs[0] + '`.');
        }

        this.ensureUserCanRequestRole(message.serverConfig, message.userId, requestable);

        const result = await DiscordPromises.giveRoleToUser(phil.bot, message.server.id, message.userId, requestable.role.id);
        BotUtils.sendSuccessMessage({
            bot: phil.bot,
            channelId: message.channelId,
            message: 'You have been granted the "' + requestable.role.name + '" role!'
        });
    }

    private ensureUserCanRequestRole(serverConfig: IServerConfig, userId: string, requestable: Requestable) {
        const member = serverConfig.server.members[userId];
        if (member.roles.indexOf(requestable.role.id) >= 0) {
            throw new Error('You already have the "' + requestable.role.name + '" role. You can use `' + serverConfig.commandPrefix + 'remove` to remove the role if you wish.');
        }
    }

    private async processNoCommandArgs(phil: Phil, message: IPublicMessage): Promise<any> {
        const requestables = await Requestable.getAllRequestables(phil.db, message.server);
        if (requestables.length === 0) {
            throw new Error('There are no requestable roles defined. An admin should use `' + message.serverConfig.commandPrefix + 'define` to create some roles.');
        }

        const reply = this.composeAllRequestablesList(message.serverConfig, requestables);
        return DiscordPromises.sendMessageBuilder(phil.bot, message.channelId, reply);
    }

    private composeAllRequestablesList(serverConfig: IServerConfig, requestables: Requestable[]): MessageBuilder {
        const builder = new MessageBuilder();
        builder.append(':snowflake: You must provide a valid requestable name of a role when using `' + serverConfig.commandPrefix + 'request`. These are currently:\n');

        for (const requestable of requestables) {
            builder.append(this.composeRequestableListEntry(requestable));
        }

        const randomRequestable = BotUtils.getRandomArrayEntry(requestables);
        const randomRequestableString = BotUtils.getRandomArrayEntry(randomRequestable.requestStrings);

        builder.append('\nJust use one of the above requestable names, like `' + serverConfig.commandPrefix + 'request ' + randomRequestableString + '`.');
        return builder;
    }

    private composeRequestableListEntry(requestable: Requestable): string {
        let entry = '- ';
        entry += BotUtils.stitchTogetherArray(requestable.requestStrings);
        entry += ' to receive the "' + requestable.role.name + '" role\n';
        return entry;
    }
}
