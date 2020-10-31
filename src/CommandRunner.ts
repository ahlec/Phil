import { Client as DiscordIOClient } from 'discord.io';
import { sortBy, uniqBy, values } from 'lodash';

import ReceivedServerMessage from '@phil/discord/ReceivedServerMessage';

import Command, { CommandLookup } from './commands/@types';
import { instantiateCommands } from './commands/index';
import CommandInvocation from './CommandInvocation';
import Database from './database';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';
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
    message: ReceivedServerMessage
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

    if (command.feature && message.channel.server) {
      const isFeatureEnabled = await command.feature.getIsEnabled(
        this.db,
        message.channel.server.id
      );
      if (!isFeatureEnabled) {
        this.reportInvalidCommand(message, invocation);
        return;
      }
    }

    const canUseCommand = await this.canUserUseCommand(
      command,
      invocation,
      message
    );
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
    message: ReceivedServerMessage,
    invocation: CommandInvocation
  ): void {
    this.write(
      `user ${message.sender.user.fullUsername} used command ${invocation.context.serverConfig.commandPrefix}${invocation.commandName}`
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
    message: ReceivedServerMessage,
    invocation: CommandInvocation
  ): Promise<void> {
    await sendErrorMessage({
      bot: this.bot,
      channelId: message.channel.id,
      message: `There is no \`${invocation.context.serverConfig.commandPrefix}${invocation.commandName}\` command.`,
    });
  }

  private canUserUseCommand(
    command: Command,
    invocation: CommandInvocation,
    message: ReceivedServerMessage
  ): Promise<boolean> {
    switch (command.permissionLevel) {
      case PermissionLevel.General: {
        return Promise.resolve(true);
      }
      case PermissionLevel.AdminOnly: {
        return invocation.context.serverConfig.isAdmin(
          this.phil.bot,
          message.sender.user.id
        );
      }
      default: {
        return command.permissionLevel;
      }
    }
  }

  private async reportCannotUseCommand(
    message: ReceivedServerMessage,
    command: Command,
    invocation: CommandInvocation
  ): Promise<void> {
    const permissionLevelName = getPermissionLevelName(command.permissionLevel);
    await sendErrorMessage({
      bot: this.bot,
      channelId: message.channel.id,
      message: `The \`${invocation.context.serverConfig.commandPrefix}${invocation.commandName}\` command requires ${permissionLevelName} privileges to use here.`,
    });
  }

  private async runCommand(
    message: ReceivedServerMessage,
    command: Command,
    invocation: CommandInvocation
  ): Promise<void> {
    try {
      await command.invoke(invocation, this.phil.db, this.phil);
    } catch (err) {
      await this.reportCommandError(err, message.channel.id);
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
