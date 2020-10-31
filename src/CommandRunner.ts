import { sortBy, uniqBy, values } from 'lodash';

import Command, { CommandLookup } from './commands/@types';
import { instantiateCommands } from './commands/index';
import CommandInvocation from './CommandInvocation';
import Database from './database';
import Logger from './Logger';
import LoggerDefinition from './LoggerDefinition';
import PermissionLevel, { getPermissionLevelName } from './permission-level';
import Phil from './phil';

const definition = new LoggerDefinition('Command Runner');

export default class CommandRunner extends Logger {
  private readonly commands: CommandLookup;

  constructor(private readonly phil: Phil, private readonly db: Database) {
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

  public async invoke(invocation: CommandInvocation): Promise<void> {
    this.logInputReceived(invocation);

    const command = this.getCommandFromInvocation(invocation);
    if (command === null) {
      this.reportInvalidCommand(invocation);
      return;
    }

    if (command.feature) {
      const isFeatureEnabled = await command.feature.getIsEnabled(
        this.db,
        invocation.context.server.id
      );
      if (!isFeatureEnabled) {
        this.reportInvalidCommand(invocation);
        return;
      }
    }

    const canUseCommand = await this.canUserUseCommand(command, invocation);
    if (!canUseCommand) {
      this.reportCannotUseCommand(command, invocation);
      return;
    }

    await this.runCommand(command, invocation);
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

  private logInputReceived(invocation: CommandInvocation): void {
    this.write(
      `user ${invocation.member.user.fullUsername} used command ${invocation.context.serverConfig.commandPrefix}${invocation.commandName}`
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
    invocation: CommandInvocation
  ): Promise<void> {
    await invocation.respond({
      error: `There is no \`${invocation.context.serverConfig.commandPrefix}${invocation.commandName}\` command.`,
      type: 'error',
    });
  }

  private canUserUseCommand(
    command: Command,
    invocation: CommandInvocation
  ): Promise<boolean> {
    switch (command.permissionLevel) {
      case PermissionLevel.General: {
        return Promise.resolve(true);
      }
      case PermissionLevel.AdminOnly: {
        return invocation.context.serverConfig.isAdmin(
          this.phil.bot,
          invocation.member.user.id
        );
      }
      default: {
        return command.permissionLevel;
      }
    }
  }

  private async reportCannotUseCommand(
    command: Command,
    invocation: CommandInvocation
  ): Promise<void> {
    const permissionLevelName = getPermissionLevelName(command.permissionLevel);
    await invocation.respond({
      type: 'error',
      error: `The \`${invocation.context.serverConfig.commandPrefix}${invocation.commandName}\` command requires ${permissionLevelName} privileges to use here.`,
    });
  }

  private async runCommand(
    command: Command,
    invocation: CommandInvocation
  ): Promise<void> {
    try {
      await command.invoke(invocation, this.phil.db, this.phil);
    } catch (err) {
      this.error(err);
      await invocation.respond({
        type: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}
