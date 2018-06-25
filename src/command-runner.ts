import ICommand from 'commands/@types';
import { CommandLookup } from 'commands/index';
import Database from 'database';
import { Client as DiscordIOClient } from 'discord.io';
import InputMessage from 'input-message';
import IPublicMessage from 'messages/public';
import Phil from 'phil';
import BotUtils from 'utils';

const util = require('util');

export default class CommandRunner {
    constructor(private readonly phil: Phil,
        private readonly bot: DiscordIOClient,
        private readonly db: Database) {
    }

    public isCommand(message: IPublicMessage): boolean {
        const input = InputMessage.parseFromMessage(message.serverConfig, message.content);
        return (input !== null);
    }

    public async runMessage(message: IPublicMessage) {
        const input = InputMessage.parseFromMessage(message.serverConfig, message.content);
        if (input === null) {
            return;
        }
        this.logInputReceived(message, input);

        const command = this.getCommandFromInputMessage(input);
        if (command === null) {
            this.reportInvalidCommand(message, input);
            return;
        }

        if (command.feature && message.server) {
            const isFeatureEnabled = await command.feature.getIsEnabled(this.db, message.server.id);
            if (!isFeatureEnabled) {
                this.reportInvalidCommand(message, input);
                return;
            }
        }

        if (!this.canUserUseCommand(command, message)) {
            this.reportCannotUseCommand(message, command, input);
            return;
        }

        await this.runCommand(message, command, input);
    }

    private logInputReceived(message: IPublicMessage, input: InputMessage) {
        console.log('user \'%s#%d\' used command \'%s%s\'',
            message.user.username,
            message.user.discriminator,
            message.serverConfig.commandPrefix,
            input.commandName);
    }

    private getCommandFromInputMessage(input: InputMessage) {
        if (input.commandName in CommandLookup) {
            return CommandLookup[input.commandName];
        }
        return null;
    }

    private reportInvalidCommand(message: IPublicMessage, input: InputMessage) {
        BotUtils.sendErrorMessage({
            bot: this.bot,
            channelId: message.channelId,
            message: `There is no \`${message.serverConfig.commandPrefix}${input.commandName}\` command.`
        });
    }

    private canUserUseCommand(command: ICommand, message: IPublicMessage): boolean {
        if (!command.isAdminCommand) {
            return true;
        }

        const member = message.server.members[message.userId];
        return message.serverConfig.isAdmin(member);
    }

    private reportCannotUseCommand(message: IPublicMessage, command: ICommand, input: InputMessage) {
        BotUtils.sendErrorMessage({
            bot: this.bot,
            channelId: message.channelId,
            message: `The \`${message.serverConfig.commandPrefix}${input.commandName}\` command requires admin privileges to use here.`
        });
    }

    private async runCommand(message: IPublicMessage, command: ICommand, input: InputMessage) {
        try {
            await command.processMessage(this.phil, message, input.commandArgs);
        } catch(err) {
            await this.reportCommandError(err, message.channelId);
        }
    }

    private async reportCommandError(err: Error, channelId: string) {
        console.error(util.inspect(err));
        BotUtils.sendErrorMessage({
            bot: this.bot,
            channelId,
            message: err.message
        });
    }
};
