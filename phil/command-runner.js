'use strict';

const botUtils = require('../bot_utils.js');
const InputMessage = require('./input-message');

module.exports = class CommandRunner {
    constructor(bot, commands, chronos, db)
    {
        this._bot = bot;
        this._commands = commands;
        this._chronos = chronos;
        this._db = db;
    }

    isCommand(message) {
        const input = InputMessage.parseFromMessage(message);
        return (commandPrompt != null);
    }

    runMessage(user, userId, channelId, message) {
        const input = InputMessage.parseFromMessage(message);
        if (input === null) {
            return;
        }
        this._logInputReceived(user, userId, input);

        const command = this._getCommandFromInputMessage(input);
        if (command === null) {
            this._reportInvalidCommand(channelId, input);
            return;
        }

        const commandData = this._getCommandDataForChannel(command, input, channelId);
        if (typeof(commandData.func) !== 'function') {
            this._reportInvalidChannel(channelId, commandData);
            return;
        }

        if (!this._canUserUseCommand(commandData, userId, channelId)) {
            this._reportCannotUseCommand(channelId, commandData);
            return;
        }

        this._runCommand(user, userId, channelId, commandData, input);
    }

    _logInputReceived(user, userId, input) {
        const commandName = input.getCommandName();
        console.log('user \'%s\' (%s) used command \'%s\'', user, userId, commandName);
    }

    _getCommandFromInputMessage(input) {
        const commandName = input.getCommandName();
        if (commandName in this._commands) {
            return this._commands[commandName];
        }
        return null;
    }

    _reportInvalidCommand(channelId, input) {
        const commandName = input.getCommandName();
        botUtils.sendErrorMessage({
            bot: this._bot,
            channelId: channelId,
            message: 'There is no `' + process.env.COMMAND_PREFIX + commandName + '` command.'
        });
    }

    _getCommandDataForChannel(command, input, channelId) {
        const isDirectMessage = ( channelId in this._bot.directMessages ? true : false );
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

    _reportInvalidChannel(channelId, commandData) {
        botUtils.sendErrorMessage({
            bot: this._bot,
            channelId: channelId,
            message: commandData.incorrectChannelMessage
        });
    }

    _canUserUseCommand(commandData, userId, channelId) {
        if (!commandData.requiresAdmin) {
            return true;
        }
        
        const serverId = this._bot.channels[channelId].guild_id;
        const server = this._bot.servers[serverId];
        const member = server.members[userId];
        return botUtils.isMemberAnAdminOnServer(member, server);
    }

    _reportCannotUseCommand(channelId, commandData, input) {
        const commandName = input.getCommandName();
        botUtils.sendErrorMessage({
            bot: this._bot,
            channelId: channelId,
            message: 'The `' + process.env.COMMAND_PREFIX + commandName + '` command requires admin privileges to use here.'
        });
    }

    _runCommand(user, userId, channelId, commandData, input) {
        const commandArgs = input.getCommandArgs();
        commandData.func(this._bot, user, userId, channelId, commandArgs, this._db);
    }
};