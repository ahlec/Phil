'use strict';

import { Command } from './@types';
import { HelpGroup } from '../phil/help-groups';
import { Client as DiscordIOClient, Role as DiscordIORole, Server as DiscordIOServer } from 'discord.io';
import { DiscordMessage } from '../phil/discord-message';
import { Database } from '../phil/database';
import { DiscordPromises } from '../promises/discord';
import { Features } from '../phil/features';
import { BotUtils } from '../phil/utils';
import { Requestable, RequestableCreationDefinition } from '../phil/requestables';
import { MessageBuilder } from '../phil/message-builder';

export class DefineCommand implements Command {
    readonly name = 'define';
    readonly aliases : string[] = [];
    readonly feature = Features.Requestables;

    readonly helpGroup = HelpGroup.Roles;
    readonly helpDescription = 'Creates a new requestable role that users can use with `' + process.env.COMMAND_PREFIX + 'request`';

    readonly versionAdded = 1;

    readonly publicRequiresAdmin = true;
    async processPublicMessage(bot : DiscordIOClient, message : DiscordMessage, commandArgs : string[], db : Database) : Promise<any> {
        const definition = this.getDefinitionData(commandArgs, message.server);
        if (!Requestable.checkIsValidRequestableName(definition.name)) {
            throw new Error('The name you provided isn\'t valid to use as a requestable. It must be at least two characters in length and made up only of alphanumeric characters and dashes.');
        }

        const existing = await Requestable.getFromRequestString(db, message.server, definition.name);
        if (existing) {
            throw new Error('There is already a `' + definition.name + '` request string.');
        }

        await Requestable.createRequestable(db, message.server, definition);
        const reply = '`' + definition.name + '` has been set up for use with `' + process.env.COMMAND_PREFIX + 'request` to grant the ' + definition.role.name + ' role.';
        BotUtils.sendSuccessMessage({
            bot: bot,
            channelId: message.channelId,
            message: reply
        });
    }

    private getDefinitionData(commandArgs : string[], server : DiscordIOServer) : RequestableCreationDefinition {
        if (commandArgs.length < 2) {
            throw new Error('`' + process.env.COMMAND_PREFIX + 'define` requires two parameters, separated by a space:\n' +
                '[1] the text to be used by users with `' + process.env.COMMAND_PREFIX + 'request` (cannot contain any spaces)\n' +
                '[2] the full name of the Discord role (as it currently is spelled)');
        }

        const requestString = commandArgs[0].toLowerCase().replace(/`/g, '');
        if (requestString.length === 0) {
            throw new Error('The request string that you entered is invalid or contained only invalid characters.');
        }

        const roleName = commandArgs.slice(1).join(' ').trim().toLowerCase();
        for (let roleId in server.roles) {
            const role = server.roles[roleId];
            if (role.name.toLowerCase() === roleName) {
                return {
                    name: requestString,
                    role: role
                };
            }
        }

        throw new Error('There is no role with the name of `' + roleName + '`.');
    }
};
