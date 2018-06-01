'use strict';

import { Client } from 'discord.io';
import { IPublicMessage } from 'phil';
import { Database } from './database';
import { InputMessage } from './input-message';
import { Command } from '../commands/@types';
import { CommandLookup } from '../commands/index';
import { Phil } from './phil';
import { BotUtils } from './utils';
import { Feature } from './features';

const util = require('util');

export class CommandRunner {
    constructor(private readonly phil : Phil,
        private readonly bot : Client,
        private readonly db : Database) {
    }

    public isCommand(message : IPublicMessage) : boolean {
        const input = InputMessage.parseFromMessage(message.serverConfig, message.content);
        return (input !== null);
    }

    public async runMessage(message : IPublicMessage) {
        const input = InputMessage.parseFromMessage(message.serverConfig, message.content);
        if (input === null) {
            return;
        }
        this.logInputReceived(message, input);

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

        if (!this._canUserUseCommand(command, message)) {
            this._reportCannotUseCommand(message, command, input);
            return;
        }

        await this.runCommand(message, command, input);
    }

    private logInputReceived(message : IPublicMessage, input : InputMessage) {
        const commandName = input.getCommandName();
        console.log('user \'%s#%d\' used command \'%s%s\'',
            message.user.username,
            message.user.discriminator,
            message.serverConfig.commandPrefix,
            commandName);
    }

    private _getCommandFromInputMessage(input : InputMessage) {
        const commandName = input.getCommandName();
        if (commandName in CommandLookup) {
            return CommandLookup[commandName];
        }
        return null;
    }

    private _reportInvalidCommand(message : IPublicMessage, input : InputMessage) {
        const commandName = input.getCommandName();
        BotUtils.sendErrorMessage({
            bot: this.bot,
            channelId: message.channelId,
            message: 'There is no `' + message.serverConfig.commandPrefix + commandName + '` command.'
        });
    }

    private _canUserUseCommand(command : Command, message : IPublicMessage) : boolean {
        if (!command.isAdminCommand) {
            return true;
        }

        const member = message.server.members[message.userId];
        return message.serverConfig.isAdmin(member);
    }

    private _reportCannotUseCommand(message : IPublicMessage, command : Command, input : InputMessage) {
        const commandName = input.getCommandName();
        BotUtils.sendErrorMessage({
            bot: this.bot,
            channelId: message.channelId,
            message: 'The `' + message.serverConfig.commandPrefix + commandName + '` command requires admin privileges to use here.'
        });
    }

    private async runCommand(message : IPublicMessage, command : Command, input : InputMessage) {
        const commandArgs = input.getCommandArgs();

        try {
            await command.processMessage(this.phil, message, commandArgs);
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
