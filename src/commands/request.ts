'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { HelpGroup } from '../phil/help-groups';
import { DiscordMessage } from '../phil/discord-message';
import { DiscordPromises } from '../promises/discord';
import { Features } from '../phil/features';
import { BotUtils } from '../phil/utils';
import { Requestable } from '../phil/requestables';
import { MessageBuilder } from '../phil/message-builder';
import { ServerConfig } from '../phil/server-config';

export class RequestCommand implements Command {
    readonly name = 'request';
    readonly aliases = ['giveme'];
    readonly feature = Features.Requestables;

    readonly helpGroup = HelpGroup.Roles;
    readonly helpDescription = 'Asks Phil to give you a role. Using the command by itself will show you all of the roles he can give you.';

    readonly versionAdded = 1;

    readonly publicRequiresAdmin = false;
    async processPublicMessage(phil : Phil, message : DiscordMessage, commandArgs : string[]) : Promise<any> {
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

    private ensureUserCanRequestRole(serverConfig : ServerConfig, userId : string, requestable : Requestable) {
        const member = serverConfig.server.members[userId];
        if (member.roles.indexOf(requestable.role.id) >= 0) {
            throw new Error('You already have the "' + requestable.role.name + '" role. You can use `' + serverConfig.commandPrefix + 'remove` to remove the role if you wish.');
        }
    }

    private async processNoCommandArgs(phil : Phil, message : DiscordMessage) : Promise<any> {
        const requestables = await Requestable.getAllRequestables(phil.db, message.server);
        if (requestables.length === 0) {
            throw new Error('There are no requestable roles defined. An admin should use `' + message.serverConfig.commandPrefix + 'define` to create some roles.');
        }

        const reply = this.composeAllRequestablesList(message.serverConfig, requestables);
        return DiscordPromises.sendMessageBuilder(phil.bot, message.channelId, reply);
    }

    private composeAllRequestablesList(serverConfig : ServerConfig, requestables : Requestable[]) : MessageBuilder {
        const builder = new MessageBuilder();
        builder.append(':snowflake: You must provide a valid requestable name of a role when using `' + serverConfig.commandPrefix + 'request`. These are currently:\n');

        for (let requestable of requestables) {
            builder.append(this.composeRequestableListEntry(requestable));
        }

        const randomRequestable = BotUtils.getRandomArrayEntry(requestables);
        const randomRequestableString = BotUtils.getRandomArrayEntry(randomRequestable.requestStrings);

        builder.append('\nJust use one of the above requestable names, like `' + serverConfig.commandPrefix + 'request ' + randomRequestableString + '`.');
        return builder;
    }

    private composeRequestableListEntry(requestable : Requestable) : string {
        var entry = '- ';
        entry += BotUtils.stitchTogetherArray(requestable.requestStrings);
        entry += ' to receive the "' + requestable.role.name + '" role\n';
        return entry;
    }
}
