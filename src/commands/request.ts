'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient, Server as DiscordIOServer } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { instance as DiscordPromises } from '../promises/discord';
import { Features } from '../phil/features';
import { BotUtils } from '../phil/utils';
import { Requestable } from '../phil/requestables';
import { MessageBuilder } from '../phil/message-builder';

export class RequestCommand implements Command {
    readonly name = 'request';
    readonly aliases = ['giveme'];
    readonly feature = Features.Requestables;

    readonly helpGroup = HelpGroup.Roles;
    readonly helpDescription = 'Asks Phil to give you a role. Using the command by itself will show you all of the roles he can give you.';

    readonly versionAdded = 1;

    readonly publicRequiresAdmin = false;
    async processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        if (commandArgs.length === 0) {
            return this.processNoCommandArgs(bot, message, db);
        }

        const requestable = await Requestable.getFromRequestString(db, message.server, commandArgs[0]);
        if (!requestable) {
            throw new Error('There is no requestable by the name of `' + commandArgs[0] + '`.');
        }

        this.ensureUserCanRequestRole(message.server, message.userId, requestable);

        const result = await DiscordPromises.giveRoleToUser(bot, message.server.id, message.userId, requestable.role.id);
        BotUtils.sendSuccessMessage({
            bot: bot,
            channelId: message.channelId,
            message: 'You have been granted the "' + requestable.role.name + '" role!'
        });
    }

    private ensureUserCanRequestRole(server : DiscordIOServer, userId : string, requestable : Requestable) {
        const member = server.members[userId];
        if (member.roles.indexOf(requestable.role.id) >= 0) {
            throw new Error('You already have the "' + requestable.role.name + '" role. You can use `' + process.env.COMMAND_PREFIX + 'remove` to remove the role if you wish.');
        }
    }

    private async processNoCommandArgs(bot : DiscordIOClient, message : DiscordMessage, db : Database) : Promise<any> {
        const requestables = await Requestable.getAllRequestables(db, message.server);
        if (requestables.length === 0) {
            throw new Error('There are no requestable roles defined. An admin should use `' + process.env.COMMAND_PREFIX + 'define` to create some roles.');
        }

        const reply = this.composeAllRequestablesList(requestables);
        return DiscordPromises.sendMessageBuilder(bot, message.channelId, reply);
    }

    private composeAllRequestablesList(requestables : Requestable[]) : MessageBuilder {
        const builder = new MessageBuilder();
        builder.append(':snowflake: You must provide a valid requestable name of a role when using `' + process.env.COMMAND_PREFIX + 'request`. These are currently:\n');

        for (let requestable of requestables) {
            builder.append(this.composeRequestableListEntry(requestable));
        }

        const randomRequestable = BotUtils.getRandomArrayEntry(requestables);
        const randomRequestableString = BotUtils.getRandomArrayEntry(randomRequestable.requestStrings);

        builder.append('\nJust use one of the above requestable names, like `' + process.env.COMMAND_PREFIX + 'request ' + randomRequestableString + '`.');
        return builder;
    }

    private composeRequestableListEntry(requestable : Requestable) : string {
        var entry = '- ';
        entry += BotUtils.stitchTogetherArray(requestable.requestStrings);
        entry += ' to receive the "' + requestable.role.name + '" role\n';
        return entry;
    }
}
