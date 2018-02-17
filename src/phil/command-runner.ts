'use strict';

const botUtils = require('../phil/utils');
const util = require('util');
const InputMessage = require('./input-message');

import { Client } from 'discord.io';
import { Database } from './database';
import { DiscordMessage } from './discord-message';

export class CommandRunner {
    private readonly _bot : Client;
    private readonly _db : Database;

    constructor(bot : Client, commands, db : Database) {
        this._bot = bot;
        this._commands = commands;
        this._db = db;
    }

    public isCommand(message : DiscordMessage) : boolean {
        const input = InputMessage.parseFromMessage(message.content);
        return (input !== null);
    }

    public runMessage(message : DiscordMessage) {
        const input = InputMessage.parseFromMessage(message.content);
        if (input === null) {
            return;
        }
        this._logInputReceived(message, input);

        const command = this._getCommandFromInputMessage(input);
        if (command === null) {
            this._reportInvalidCommand(message, input);
            return;
        }

        const commandData = this._getCommandDataForChannel(command, input, message);
        if (typeof(commandData.func) !== 'function') {
            this._reportInvalidChannel(message, commandData);
            return;
        }

        if (!this._canUserUseCommand(commandData, message)) {
            this._reportCannotUseCommand(message, commandData);
            return;
        }

        this._runCommand(message, commandData, input);
    }

    private _logInputReceived(message : DiscordMessage, input) {
        const commandName = input.getCommandName();
        console.log('user \'%s\' (%s) used command \'%s\'', message.user, message.userId, commandName);
    }

    private _getCommandFromInputMessage(input) {
        const commandName = input.getCommandName();
        if (commandName in this._commands) {
            return this._commands[commandName];
        }
        return null;
    }

    private _reportInvalidCommand(message : DiscordMessage, input) {
        const commandName = input.getCommandName();
        botUtils.sendErrorMessage({
            bot: this._bot,
            channelId: message.channelId,
            message: 'There is no `' + process.env.COMMAND_PREFIX + commandName + '` command.'
        });
    }

    private _getCommandDataForChannel(command, input, message : DiscordMessage) {
        const isDirectMessage = (message.channelId in this._bot.directMessages);
        const commandName = input.getCommandName();

        if (isDirectMessage) {
            return {
                requiresAdmin: command.privateRequiresAdmin,
                func: command.processPrivateMessage,
                incorrectChannelMessage: 'The `' + process.env.COMMAND_PREFIX + commandName + '` command can only be used in the public server itself.'
            };
        }

        return {
            requiresAdmin: command.publicRequiresAdmin,
            func: command.processPublicMessage,
            incorrectChannelMessage: 'The `' + process.env.COMMAND_PREFIX + commandName + '` command can only be used in a direct message with me.'
        };
    }

    private _reportInvalidChannel(message : DiscordMessage, commandData) {
        botUtils.sendErrorMessage({
            bot: this._bot,
            channelId: message.channelId,
            message: commandData.incorrectChannelMessage
        });
    }

    private _canUserUseCommand(commandData, message : DiscordMessage) : boolean {
        if (!commandData.requiresAdmin) {
            return true;
        }

        const serverId = this._bot.channels[message.channelId].guild_id;
        const server = this._bot.servers[serverId];
        const member = server.members[message.userId];
        return botUtils.isMemberAnAdminOnServer(member, server);
    }

    private _reportCannotUseCommand(message : DiscordMessage, commandData, input) {
        const commandName = input.getCommandName();
        botUtils.sendErrorMessage({
            bot: this._bot,
            channelId: message.channelId,
            message: 'The `' + process.env.COMMAND_PREFIX + commandName + '` command requires admin privileges to use here.'
        });
    }

    private _runCommand(message : DiscordMessage, commandData, input) {
        const commandArgs = input.getCommandArgs();
        const commandPromise = commandData.func(this._bot, message, commandArgs, this._db);
        if (!botUtils.isPromise(commandPromise)) {
            console.error('Command \'%s\' did not return a promise with command args \'%s\'.', input.getCommandName(), util.inspect(commandArgs));
        } else {
            commandPromise.catch(err => this._reportCommandError(err, message.channelId));
        }
    }

    private _reportCommandError(err, channelId) {
        console.error(err);

        var errorMessage = err;
        if (typeof(errorMessage) !== 'string') {
            errorMessage = 'Uh oh. An elf just broke something. Hey @' + process.env.BOT_MANAGER_USERNAME + ', could you take a look for me?';
        }

        botUtils.sendErrorMessage({
            bot: this._bot,
            channelId: channelId,
            message: errorMessage
        });
    }
};
