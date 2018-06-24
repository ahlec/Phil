import { Client as DiscordIOClient, Role as DiscordIORole, Server as DiscordIOServer } from 'discord.io';
import { IPublicMessage, IServerConfig } from 'phil';
import Database from '../phil/database';
import Features from '../phil/features/all-features';
import { HelpGroup } from '../phil/help-groups';
import MessageBuilder from '../phil/message-builder';
import Phil from '../phil/phil';
import Requestable, { IRequestableCreationDefinition } from '../phil/requestables';
import { BotUtils } from '../phil/utils';
import { DiscordPromises } from '../promises/discord';
import ICommand from './@types';

export default class DefineCommand implements ICommand {
    public readonly name = 'define';
    public readonly aliases: ReadonlyArray<string> = [];
    public readonly feature = Features.Requestables;

    public readonly helpGroup = HelpGroup.Roles;
    public readonly helpDescription = 'Creates a new requestable role that users can use with the request command.';

    public readonly versionAdded = 1;

    public readonly isAdminCommand = true;
    public async processMessage(phil: Phil, message: IPublicMessage, commandArgs: ReadonlyArray<string>): Promise<any> {
        const definition = this.getDefinitionData(commandArgs, message.serverConfig);
        if (!Requestable.checkIsValidRequestableName(definition.name)) {
            throw new Error('The name you provided isn\'t valid to use as a requestable. It must be at least two characters in length and made up only of alphanumeric characters and dashes.');
        }

        const existing = await Requestable.getFromRequestString(phil.db, message.server, definition.name);
        if (existing) {
            throw new Error('There is already a `' + definition.name + '` request string.');
        }

        await Requestable.createRequestable(phil.db, message.server, definition);
        const reply = '`' + definition.name + '` has been set up for use with `' + message.serverConfig.commandPrefix + 'request` to grant the ' + definition.role.name + ' role.';
        BotUtils.sendSuccessMessage({
            bot: phil.bot,
            channelId: message.channelId,
            message: reply
        });
    }

    private getDefinitionData(commandArgs: ReadonlyArray<string>, serverConfig: IServerConfig): IRequestableCreationDefinition {
        if (commandArgs.length < 2) {
            throw new Error('`' + serverConfig.commandPrefix + 'define` requires two parameters, separated by a space:\n' +
                '[1] the text to be used by users with `' + serverConfig.commandPrefix + 'request` (cannot contain any spaces)\n' +
                '[2] the full name of the Discord role (as it currently is spelled)');
        }

        const requestString = commandArgs[0].toLowerCase().replace(/`/g, '');
        if (requestString.length === 0) {
            throw new Error('The request string that you entered is invalid or contained only invalid characters.');
        }

        const roleName = commandArgs.slice(1).join(' ').trim().toLowerCase();
        for (const roleId in serverConfig.server.roles) {
            if (!serverConfig.server.roles.hasOwnProperty(roleId)) {
                continue;
            }

            const role = serverConfig.server.roles[roleId];
            if (role.name.toLowerCase() === roleName) {
                return {
                    name: requestString,
                    role
                };
            }
        }

        throw new Error('There is no role with the name of `' + roleName + '`.');
    }
};
