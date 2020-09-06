import { Role as DiscordIORole, Server as DiscordIOServer } from 'discord.io';
import CommandInvocation from '@phil/CommandInvocation';
import Feature from '@phil/features/feature';
import { HelpGroup } from '@phil/help-groups';
import Phil from '@phil/phil';
import {
  EditRoleOptions,
  createRole,
  editRole,
  giveRoleToUser,
  takeRoleFromUser,
  getMemberRolesInServer,
} from '@phil/promises/discord';
import ServerConfig from '@phil/server-config';
import Command, { LoggerDefinition } from '@phil/commands/@types';
import Database from '@phil/database';

interface MemberUniqueRoleCommandBaseDetails {
  aliases?: ReadonlyArray<string>;
  feature?: Feature;
  helpDescription: string;
  versionAdded: number;
}

abstract class MemberUniqueRoleCommandBase<TData> extends Command {
  public constructor(
    name: string,
    parentDefinition: LoggerDefinition,
    details: MemberUniqueRoleCommandBaseDetails
  ) {
    super(name, parentDefinition, {
      aliases: details.aliases,
      feature: details.feature,
      helpDescription: details.helpDescription,
      helpGroup: HelpGroup.Roles,
      versionAdded: details.versionAdded,
    });
  }

  public async invoke(
    invocation: CommandInvocation,
    database: Database,
    legacyPhil: Phil
  ): Promise<void> {
    const data = this.getDataFromCommandArgs(
      invocation.context.serverConfig,
      invocation.commandArgs
    );
    const newRole = await this.getRoleFromData(
      legacyPhil,
      invocation.server,
      data
    );

    await this.removeAllRolesInPoolFromUser(
      legacyPhil,
      invocation.server,
      invocation.userId
    );
    await giveRoleToUser(
      legacyPhil.bot,
      invocation.server.id,
      invocation.userId,
      newRole.id
    );

    await invocation.respond({
      text: this.getSuccessMessage(invocation.context.serverConfig, data),
      type: 'success',
    });
  }

  protected abstract getMissingCommandArgsErrorMessage(
    serverConfig: ServerConfig
  ): string;
  protected abstract getInvalidInputErrorMessage(
    input: string,
    serverConfig: ServerConfig
  ): string;
  protected abstract tryParseInput(input: string): TData | null;
  protected abstract isRolePartOfUniquePool(role: DiscordIORole): boolean;
  protected abstract doesRoleMatchData(
    role: DiscordIORole,
    data: TData
  ): boolean;
  protected abstract getRoleConfig(data: TData): EditRoleOptions;
  protected abstract getSuccessMessage(
    serverConfig: ServerConfig,
    data: TData
  ): string;

  private getDataFromCommandArgs(
    serverConfig: ServerConfig,
    commandArgs: ReadonlyArray<string>
  ): TData {
    if (commandArgs.length === 0) {
      const errorMessage = this.getMissingCommandArgsErrorMessage(serverConfig);
      throw new Error(errorMessage);
    }

    const data = this.tryParseInput(commandArgs[0]);
    if (!data) {
      const errorMessage = this.getInvalidInputErrorMessage(
        commandArgs[0],
        serverConfig
      );
      throw new Error(errorMessage);
    }

    return data;
  }

  private async removeAllRolesInPoolFromUser(
    legacyPhil: Phil,
    server: DiscordIOServer,
    userId: string
  ): Promise<void> {
    const memberRoles = await getMemberRolesInServer(
      legacyPhil.bot,
      server.id,
      userId
    );
    for (const roleId of memberRoles) {
      const role = server.roles[roleId];
      if (!this.isRolePartOfUniquePool(role)) {
        continue;
      }

      await takeRoleFromUser(legacyPhil.bot, server.id, userId, roleId);
    }
  }

  private async getRoleFromData(
    phil: Phil,
    server: DiscordIOServer,
    data: TData
  ): Promise<DiscordIORole> {
    for (const roleId in server.roles) {
      const role = server.roles[roleId];
      if (this.doesRoleMatchData(role, data)) {
        return role;
      }
    }

    const newRole = await createRole(phil.bot, server.id);
    const roleOptions = this.getRoleConfig(data);
    await editRole(phil.bot, server.id, newRole.id, roleOptions);
    return newRole;
  }
}

export default MemberUniqueRoleCommandBase;
