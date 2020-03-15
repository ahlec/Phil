import { Client as DiscordIOClient } from 'discord.io';
import { sortBy, uniqBy, values } from 'lodash';
import Command, { CommandLookup } from './commands/@types';
import { instantiateCommands } from './commands/index';
import Database from './database';
import InputMessage from './input-message';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';
import IPublicMessage from './messages/public';
import PermissionLevel, { getPermissionLevelName } from './permission-level';
import Phil from './phil';
import { sendErrorMessage } from './utils';

const definition = new LoggerDefinition('Command Runner');

export default class CommandRunner extends Logger {
  private readonly commands: CommandLookup;

  constructor(
    private readonly phil: Phil,
    private readonly bot: DiscordIOClient,
    private readonly db: Database
  ) {
    super(definition);
    this.commands = instantiateCommands(definition);

    this.write('Starting runner.');
    const orderedCommands = sortBy(
      uniqBy(values(this.commands), ({ name }) => name),
      ({ name }) => name
    );
    for (const command of orderedCommands) {
      this.logCommandRegistered(command);
    }
  }

  public isCommand(message: IPublicMessage): boolean {
    const input = InputMessage.parseFromMessage(
      message.serverConfig,
      message.content
    );
    return input !== null;
  }

  public async runMessage(message: IPublicMessage) {
    const input = InputMessage.parseFromMessage(
      message.serverConfig,
      message.content
    );
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
      const isFeatureEnabled = await command.feature.getIsEnabled(
        this.db,
        message.server.id
      );
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

  private logCommandRegistered(command: Command) {
    const aliases =
      command.aliases && command.aliases.length
        ? ` (aliases: ${command.aliases.map(alias => `'${alias}'`).join(', ')})`
        : '';
    this.write(` > Registered '${command.name}'${aliases}`);
  }

  private logInputReceived(message: IPublicMessage, input: InputMessage) {
    this.write(
      `user ${message.user.username}${message.user.discriminator} used command ${message.serverConfig.commandPrefix}${input.commandName}`
    );
  }

  private getCommandFromInputMessage(input: InputMessage): Command | null {
    if (input.commandName in this.commands) {
      return this.commands[input.commandName]!;
    }

    return null;
  }

  private reportInvalidCommand(message: IPublicMessage, input: InputMessage) {
    sendErrorMessage({
      bot: this.bot,
      channelId: message.channelId,
      message: `There is no \`${message.serverConfig.commandPrefix}${input.commandName}\` command.`,
    });
  }

  private canUserUseCommand(
    command: Command,
    message: IPublicMessage
  ): boolean {
    switch (command.permissionLevel) {
      case PermissionLevel.General:
        return true;
      case PermissionLevel.AdminOnly: {
        const member = message.server.members[message.userId];
        return message.serverConfig.isAdmin(member);
      }
      default:
        return command.permissionLevel;
    }
  }

  private reportCannotUseCommand(
    message: IPublicMessage,
    command: Command,
    input: InputMessage
  ) {
    const permissionLevelName = getPermissionLevelName(command.permissionLevel);
    sendErrorMessage({
      bot: this.bot,
      channelId: message.channelId,
      message: `The \`${message.serverConfig.commandPrefix}${input.commandName}\` command requires ${permissionLevelName} privileges to use here.`,
    });
  }

  private async runCommand(
    message: IPublicMessage,
    command: Command,
    input: InputMessage
  ) {
    try {
      await command.processMessage(this.phil, message, input.commandArgs);
    } catch (err) {
      await this.reportCommandError(err, message.channelId);
    }
  }

  private async reportCommandError(err: Error, channelId: string) {
    this.error(err);
    sendErrorMessage({
      bot: this.bot,
      channelId,
      message: err.message,
    });
  }
}
