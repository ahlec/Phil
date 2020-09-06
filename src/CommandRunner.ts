import { Client as DiscordIOClient } from 'discord.io';
import { sortBy, uniqBy, values } from 'lodash';
import Command, { CommandLookup } from './commands/@types';
import { instantiateCommands } from './commands/index';
import CommandInvocation from './CommandInvocation';
import Database from './database';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';
import PublicMessage from './messages/public';
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

  public async invoke(
    invocation: CommandInvocation,
    message: PublicMessage
  ): Promise<void> {
    if (invocation === null) {
      return;
    }
    this.logInputReceived(message, invocation);

    const command = this.getCommandFromInvocation(invocation);
    if (command === null) {
      this.reportInvalidCommand(message, invocation);
      return;
    }

    if (command.feature && message.server) {
      const isFeatureEnabled = await command.feature.getIsEnabled(
        this.db,
        message.server.id
      );
      if (!isFeatureEnabled) {
        this.reportInvalidCommand(message, invocation);
        return;
      }
    }

    const canUseCommand = await this.canUserUseCommand(command, message);
    if (!canUseCommand) {
      this.reportCannotUseCommand(message, command, invocation);
      return;
    }

    await this.runCommand(message, command, invocation);
  }

  private logCommandRegistered(command: Command): void {
    const aliases =
      command.aliases && command.aliases.length
        ? ` (aliases: ${command.aliases
            .map((alias) => `'${alias}'`)
            .join(', ')})`
        : '';
    this.write(` > Registered '${command.name}'${aliases}`);
  }

  private logInputReceived(
    message: PublicMessage,
    invocation: CommandInvocation
  ): void {
    this.write(
      `user ${message.user.username}${message.user.discriminator} used command ${message.serverConfig.commandPrefix}${invocation.commandName}`
    );
  }

  private getCommandFromInvocation(
    invocation: CommandInvocation
  ): Command | null {
    if (invocation.commandName in this.commands) {
      return this.commands[invocation.commandName];
    }

    return null;
  }

  private async reportInvalidCommand(
    message: PublicMessage,
    invocation: CommandInvocation
  ): Promise<void> {
    await sendErrorMessage({
      bot: this.bot,
      channelId: message.channelId,
      message: `There is no \`${message.serverConfig.commandPrefix}${invocation.commandName}\` command.`,
    });
  }

  private canUserUseCommand(
    command: Command,
    message: PublicMessage
  ): Promise<boolean> {
    switch (command.permissionLevel) {
      case PermissionLevel.General: {
        return Promise.resolve(true);
      }
      case PermissionLevel.AdminOnly: {
        return message.serverConfig.isAdmin(this.bot, message.userId);
      }
      default: {
        return command.permissionLevel;
      }
    }
  }

  private async reportCannotUseCommand(
    message: PublicMessage,
    command: Command,
    invocation: CommandInvocation
  ): Promise<void> {
    const permissionLevelName = getPermissionLevelName(command.permissionLevel);
    await sendErrorMessage({
      bot: this.bot,
      channelId: message.channelId,
      message: `The \`${message.serverConfig.commandPrefix}${invocation.commandName}\` command requires ${permissionLevelName} privileges to use here.`,
    });
  }

  private async runCommand(
    message: PublicMessage,
    command: Command,
    invocation: CommandInvocation
  ): Promise<void> {
    try {
      await command.invoke(invocation, this.phil.db, this.phil);
    } catch (err) {
      await this.reportCommandError(err, message.channelId);
    }
  }

  private async reportCommandError(
    err: Error,
    channelId: string
  ): Promise<void> {
    this.error(err);
    await sendErrorMessage({
      bot: this.bot,
      channelId,
      message: err.message,
    });
  }
}
