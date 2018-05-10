'use strict';

import { Client } from 'discord.io';
import { Database } from './database';
import { DiscordMessage } from './discord-message';
import { InputMessage } from './input-message';
import { Command, CommandProcessFunction } from '../commands/@types';
import { CommandLookup } from '../commands/index';
import { Phil } from './phil';
import { BotUtils } from './utils';
import { Feature } from './features';

const util = require('util');

class CommandRunData {
    requiresAdmin : boolean;
    func : CommandProcessFunction;
    incorrectChannelMessage : string;
}

export class CommandRunner {
    constructor(private readonly phil : Phil,
        private readonly bot : Client,
        private readonly db : Database) {
    }

    public isCommand(message : DiscordMessage) : boolean {
        const input = InputMessage.parseFromMessage(message.serverConfig, message.content);
        return (input !== null);
    }

    public async runMessage(message : DiscordMessage) {
        const input = InputMessage.parseFromMessage(message.serverConfig, message.content);
        if (input === null) {
            return;
        }
        this._logInputReceived(message, input);

        const command = this._getCommandFromInputMessage(input);
        if (command === null) {
            this._reportInvalidCommand(message, input);
            return;
        }

        if (command.feature && message.server) {
            let isFeatureEnabled = await command.feature.getIsEnabled(this.db, message.server.id);
            if (!isFeatureEnabled) {
                this._reportInvalidCommand(message, input);
                return;
            }
        }

        const commandData = this._getCommandDataForChannel(command, input, message);
        if (typeof(commandData.func) !== 'function') {
            this._reportInvalidChannel(message, commandData);
            return;
        }

        if (!this._canUserUseCommand(commandData, message)) {
            this._reportCannotUseCommand(message, commandData, input);
            return;
        }

        await this.runCommand(message, commandData, input);
    }

    private _logInputReceived(message : DiscordMessage, input : InputMessage) {
        const commandName = input.getCommandName();
        console.log('user \'%s\' (%s) used command \'%s\'', message.user, message.userId, commandName);
    }

    private _getCommandFromInputMessage(input : InputMessage) {
        const commandName = input.getCommandName();
        if (commandName in CommandLookup) {
            return CommandLookup[commandName];
        }
        return null;
    }

    private _reportInvalidCommand(message : DiscordMessage, input : InputMessage) {
        const commandName = input.getCommandName();
        BotUtils.sendErrorMessage({
            bot: this.bot,
            channelId: message.channelId,
            message: 'There is no `' + process.env.COMMAND_PREFIX + commandName + '` command.'
        });
    }

    private _getCommandDataForChannel(command :Command, input : InputMessage, message : DiscordMessage) : CommandRunData {
        const commandName = input.getCommandName();

        if (message.isDirectMessage) {
            return {
                requiresAdmin: command.privateRequiresAdmin,
                func: command.processPrivateMessage.bind(command), // TODO: Return to this whole structure
                incorrectChannelMessage: 'The `' + process.env.COMMAND_PREFIX + commandName + '` command can only be used in the public server itself.'
            };
        }

        return {
            requiresAdmin: command.publicRequiresAdmin,
            func: command.processPublicMessage.bind(command), // TODO: Return to this whole structure
            incorrectChannelMessage: 'The `' + process.env.COMMAND_PREFIX + commandName + '` command can only be used in a direct message with me.'
        };
    }

    private _reportInvalidChannel(message : DiscordMessage, commandData : CommandRunData) {
        BotUtils.sendErrorMessage({
            bot: this.bot,
            channelId: message.channelId,
            message: commandData.incorrectChannelMessage
        });
    }

    private _canUserUseCommand(commandData : CommandRunData, message : DiscordMessage) : boolean {
        if (!commandData.requiresAdmin) {
            return true;
        }

        const serverId = this.bot.channels[message.channelId].guild_id;
        const server = this.bot.servers[serverId];
        const member = server.members[message.userId];
        return BotUtils.isMemberAnAdminOnServer(member, server);
    }

    private _reportCannotUseCommand(message : DiscordMessage, commandData : CommandRunData, input : InputMessage) {
        const commandName = input.getCommandName();
        BotUtils.sendErrorMessage({
            bot: this.bot,
            channelId: message.channelId,
            message: 'The `' + process.env.COMMAND_PREFIX + commandName + '` command requires admin privileges to use here.'
        });
    }

    private async runCommand(message : DiscordMessage, commandData : CommandRunData, input : InputMessage) {
        const commandArgs = input.getCommandArgs();

        try {
            await commandData.func(this.phil, message, commandArgs);
        } catch(err) {
            await this.reportCommandError(err, message.channelId);
        }
    }

    private async reportCommandError(err : Error, channelId : string) {
        console.error(util.inspect(err));
        BotUtils.sendErrorMessage({
            bot: this.bot,
            channelId: channelId,
            message: err.message
        });
    }
};
