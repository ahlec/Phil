'use strict';

import { Command } from './@types';
import { Phil } from '../phil/phil';
import { Database } from '../phil/database';
import { HelpGroup } from '../phil/help-groups';
import { Server as DiscordIOServer } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { DiscordPromises } from '../promises/discord';
import { Features } from '../phil/features';
import { BotUtils } from '../phil/utils';
import { Requestable } from '../phil/requestables';
import { MessageBuilder } from '../phil/message-builder';

export class RemoveCommand implements Command {
    readonly name = 'remove';
    readonly aliases : string[] = [];
    readonly feature = Features.Requestables;

    readonly helpGroup = HelpGroup.Roles;
    readonly helpDescription = 'Asks Phil to take away a requestable role that he has given you.';

    readonly versionAdded = 7;

    readonly publicRequiresAdmin = false;
    async processPublicMessage(phil : Phil, message : DiscordMessage, commandArgs : string[]) : Promise<any> {
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

    private ensureUserHasRole(server : DiscordIOServer, userId : string, requestable : Requestable) {
        const member = server.members[userId];

        if (member.roles.indexOf(requestable.role.id) < 0) {
            throw new Error('I haven\'t given you the "' + requestable.role.name + '" role.');
        }

        return requestable.role;
    }

    private async processNoCommandArgs(phil : Phil, message : DiscordMessage) : Promise<any> {
        const userRequestables = await this.getAllRequestablesUserHas(phil.db, message.server, message.userId);
        if (userRequestables.length === 0) {
            throw new Error('I haven\'t given you any requestable roles yet. You use `' + process.env.COMMAND_PREFIX + 'request` in order to obtain these roles.');
        }

        const reply = this.composeAllRequestablesList(userRequestables);
        return DiscordPromises.sendMessageBuilder(phil.bot, message.channelId, reply);
    }

    private async getAllRequestablesUserHas(db : Database, server : DiscordIOServer, userId : string) : Promise<Requestable[]> {
        const requestables = await Requestable.getAllRequestables(db, server);
        if (requestables.length === 0) {
            throw new Error('There are no requestable roles defined. An admin should use `' + process.env.COMMAND_PREFIX + 'define` to create some roles.');
        }

        const member = server.members[userId];
        const requestablesUserHas = [];
        for (let requestable of requestables) {
            if (member.roles.indexOf(requestable.role.id) >= 0) {
                requestablesUserHas.push(requestable);
            }
        }

        return requestablesUserHas;
    }

    private composeAllRequestablesList(requestables : Requestable[]) : MessageBuilder {
        const builder = new MessageBuilder();
        builder.append(':snowflake: These are the roles you can remove using `' + process.env.COMMAND_PREFIX + 'remove`:\n');

        for (let requestable of requestables) {
            builder.append(this.composeRequestableListEntry(requestable));
        }

        const randomRequestable = BotUtils.getRandomArrayEntry(requestables);
        const randomRequestableString = BotUtils.getRandomArrayEntry(randomRequestable.requestStrings);

        builder.append('\nJust use one of the above requestable names, like `' + process.env.COMMAND_PREFIX + 'remove ' + randomRequestableString + '`.');
        return builder;
    }

    private composeRequestableListEntry(requestable : Requestable) : string {
        var entry = '- ';
        entry += BotUtils.stitchTogetherArray(requestable.requestStrings);
        entry += ' to remove the "' + requestable.role.name + '" role\n';
        return entry;
    }
}
